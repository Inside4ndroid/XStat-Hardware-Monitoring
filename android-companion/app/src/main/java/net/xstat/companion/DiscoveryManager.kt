package net.xstat.companion

import android.content.Context
import android.net.ConnectivityManager
import android.net.wifi.WifiManager
import android.os.SystemClock
import android.util.Log
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.SocketTimeoutException

/** An activity-owned listener. Old workers cannot close a newer socket. */
class DiscoveryManager(context: Context) {
    private val context = context.applicationContext
    private var generation = 0L
    private var socket: DatagramSocket? = null

    @Synchronized
    fun findXStat(timeoutMs: Long, onFound: (String) -> Unit, onTimeout: () -> Unit,
                  onError: (Exception) -> Unit) {
        cancel()
        val token = generation
        Thread {
            var sock: DatagramSocket? = null
            var lock: WifiManager.MulticastLock? = null
            try {
                synchronized(this) {
                    if (token != generation) return@Thread
                    val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
                    @Suppress("DEPRECATION")
                    Log.i("XStatDiscovery", "Starting discovery; network=${connectivity.activeNetworkInfo?.typeName}")
                    val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                    lock = wifi?.createMulticastLock("XStatDiscovery")?.apply {
                        setReferenceCounted(false)
                        acquire()
                    }
                    sock = DatagramSocket(null).also {
                        socket = it
                        it.reuseAddress = true
                        it.bind(InetSocketAddress("0.0.0.0", 47210))
                    }
                }
                val receiver = checkNotNull(sock)
                Log.i("XStatDiscovery", "Listening on UDP 0.0.0.0:47210")
                val buffer = ByteArray(65)
                val packet = DatagramPacket(buffer, buffer.size)
                val deadline = SystemClock.elapsedRealtime() + timeoutMs
                var rejected = 0
                while (isCurrent(token)) {
                    val remaining = deadline - SystemClock.elapsedRealtime()
                    if (remaining <= 0) break
                    receiver.soTimeout = minOf(remaining, 1000L).toInt().coerceAtLeast(1)
                    try {
                        packet.length = buffer.size
                        receiver.receive(packet)
                        val port = BeaconProtocol.parsePort(packet.data, packet.offset, packet.length)
                        if (port == null || packet.address !is Inet4Address) {
                            if (rejected++ < 3) Log.d("XStatDiscovery", "Rejected packet: bytes=${packet.length}, source=${packet.address.hostAddress}")
                            continue
                        }
                        val url = "http://${packet.address.hostAddress}:$port"
                        synchronized(this) {
                            if (token != generation) return@Thread
                            receiver.close()
                            Log.i("XStatDiscovery", "Found XSTAT_HERE:$port; URL=$url")
                            onFound(url)
                        }
                        return@Thread
                    } catch (_: SocketTimeoutException) {
                        // Recheck cancellation and the monotonic deadline.
                    }
                }
                synchronized(this) {
                    if (token == generation) {
                        Log.i("XStatDiscovery", "Discovery timed out")
                        onTimeout()
                    }
                }
            } catch (e: Exception) {
                synchronized(this) {
                    if (token == generation) {
                        Log.e("XStatDiscovery", "UDP discovery failed", e)
                        onError(e)
                    }
                }
            } finally {
                sock?.close()
                if (lock?.isHeld == true) lock?.release()
                synchronized(this) { if (socket === sock) socket = null }
            }
        }.apply { isDaemon = true; name = "XStatDiscovery"; start() }
    }

    @Synchronized private fun isCurrent(token: Long) = token == generation

    @Synchronized fun cancel() {
        generation++
        socket?.close()
        socket = null
    }
}
