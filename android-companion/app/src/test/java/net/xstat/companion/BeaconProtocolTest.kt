package net.xstat.companion

import org.junit.Assert.*
import org.junit.Test
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

class BeaconProtocolTest {
    private fun parse(message: String) = BeaconProtocol.parsePort(message.toByteArray(Charsets.US_ASCII))

    @Test fun validPortsAndLegacyWhitespace() {
        assertEquals(9421, parse("XSTAT_HERE:9421"))
        assertEquals(1, parse("XSTAT_HERE:1"))
        assertEquals(65535, parse(" XSTAT_HERE:65535\r\n"))
    }

    @Test fun rejectsMalformedMessages() {
        listOf("", "other", "XSTAT_HERE", "XSTAT_HERE:", "XSTAT_HERE:0",
            "XSTAT_HERE:-1", "XSTAT_HERE:+80", "XSTAT_HERE:65536",
            "XSTAT_HERE:999999999999999", "XSTAT_HERE:80junk", "XSTAT_HERE:8 0",
            "XSTAT_HERE:80" + " ".repeat(65)).forEach { assertNull(it, parse(it)) }
    }

    @Test fun respectsPacketBounds() {
        val data = "xxXSTAT_HERE:8080yy".toByteArray()
        assertEquals(8080, BeaconProtocol.parsePort(data, 2, 15))
        assertNull(BeaconProtocol.parsePort(data, -1, 5))
        assertNull(BeaconProtocol.parsePort(data, 0, 65))
        assertNull(BeaconProtocol.parsePort(data, data.size, 1))
    }

    @Test fun shortPacketDoesNotTruncateFollowingBeacon() {
        DatagramSocket(0, InetAddress.getLoopbackAddress()).use { receiver ->
            receiver.soTimeout = 2000
            DatagramSocket().use { sender ->
                val buffer = ByteArray(65)
                val packet = DatagramPacket(buffer, buffer.size)
                for (message in listOf("x", "XSTAT_HERE:9421", "XSTAT_HERE:65535")) {
                    val bytes = message.toByteArray()
                    sender.send(DatagramPacket(bytes, bytes.size, InetAddress.getLoopbackAddress(), receiver.localPort))
                    packet.length = buffer.size
                    receiver.receive(packet)
                    assertEquals(parse(message), BeaconProtocol.parsePort(packet.data, packet.offset, packet.length))
                }
            }
        }
    }
}
