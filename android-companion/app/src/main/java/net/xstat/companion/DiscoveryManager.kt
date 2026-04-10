package net.xstat.companion

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.SocketTimeoutException
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Listens on UDP port 47210 for the XStat discovery beacon.
 *
 * The .NET service broadcasts:  "XSTAT_HERE:{port}"  every 2 seconds.
 * When received, we build the HTTP URL from the sender's IP + the
 * advertised port and invoke [onFound].
 */
object DiscoveryManager {

    private const val BEACON_PORT   = 47210
    private const val BEACON_PREFIX = "XSTAT_HERE:"
    private const val PACKET_SIZE   = 64

    @Volatile private var socket: DatagramSocket? = null
    private val cancelled = AtomicBoolean(false)

    /**
     * @param timeoutMs   How long to listen before giving up (ms).
     * @param onFound     Called on a background thread with the discovered URL.
     * @param onTimeout   Called on a background thread if nothing is found.
     */
    fun findXStat(
        timeoutMs: Long,
        onFound: (url: String) -> Unit,
        onTimeout: () -> Unit
    ) {
        cancelled.set(false)

        Thread {
            try {
                val sock = DatagramSocket(BEACON_PORT).also { socket = it }
                sock.soTimeout = 2_000   // 2 s read timeout; we loop until overall timeout
                sock.reuseAddress = true

                val buf    = ByteArray(PACKET_SIZE)
                val packet = DatagramPacket(buf, buf.size)
                val deadline = System.currentTimeMillis() + timeoutMs

                while (!cancelled.get() && System.currentTimeMillis() < deadline) {
                    try {
                        sock.receive(packet)

                        val message = String(packet.data, 0, packet.length, Charsets.US_ASCII).trim()
                        if (message.startsWith(BEACON_PREFIX)) {
                            val port = message.removePrefix(BEACON_PREFIX).trim().toIntOrNull()
                            if (port != null) {
                                val senderIp = packet.address.hostAddress
                                val url = "http://$senderIp:$port"
                                cancel()
                                onFound(url)
                                return@Thread
                            }
                        }
                    } catch (_: SocketTimeoutException) {
                        // Normal — keep looping until overall deadline
                    }
                }

                if (!cancelled.get()) {
                    onTimeout()
                }
            } catch (e: Exception) {
                if (!cancelled.get()) {
                    onTimeout()
                }
            } finally {
                socket?.close()
                socket = null
            }
        }.apply {
            isDaemon = true
            start()
        }
    }

    /** Cancel an in-progress discovery (e.g. activity destroyed). */
    fun cancel() {
        cancelled.set(true)
        try { socket?.close() } catch (_: Exception) { }
        socket = null
    }
}
