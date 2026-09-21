package net.xstat.companion

import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Before
import org.junit.After
import org.junit.Test
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/** Device tests; no PC service or hardware sensors are required. */

class DiscoveryManagerTest {
    private lateinit var discovery: DiscoveryManager

    @Before fun setUp() {

        discovery = DiscoveryManager(InstrumentationRegistry.getInstrumentation().targetContext)
    }

    @After fun tearDown() {
        discovery.cancel()

    }

    @Test fun testTimeoutIsNotAnError() {
        val done = CountDownLatch(1)
        val unexpected = AtomicInteger()
        discovery.findXStat(100, { unexpected.incrementAndGet() }, { done.countDown() }, { unexpected.incrementAndGet() })
        assertTrue(done.await(3, TimeUnit.SECONDS))
        assertEquals(0, unexpected.get())
    }

    @Test fun testCancelSuppressesCallbacksAndAllowsRestart() {
        val unexpected = AtomicInteger()
        discovery.findXStat(100, { unexpected.incrementAndGet() }, { unexpected.incrementAndGet() }, { unexpected.incrementAndGet() })
        discovery.cancel()
        val done = CountDownLatch(1)
        discovery.findXStat(100, { unexpected.incrementAndGet() }, { done.countDown() }, { unexpected.incrementAndGet() })
        assertTrue(done.await(3, TimeUnit.SECONDS))
        assertEquals(0, unexpected.get())
    }

    @Test fun testReplacementReceivesExactlyOneServer() {
        val unexpected = AtomicInteger()
        val found = AtomicInteger()
        val done = CountDownLatch(1)
        discovery.findXStat(5000, { unexpected.incrementAndGet() }, { unexpected.incrementAndGet() }, { unexpected.incrementAndGet() })
        discovery.findXStat(5000, { found.incrementAndGet(); done.countDown() }, { unexpected.incrementAndGet() }, { unexpected.incrementAndGet() })
        DatagramSocket().use { sender ->
            repeat(20) {
                for (message in listOf("x", "XSTAT_HERE:9421", "XSTAT_HERE:8080")) {
                    val bytes = message.toByteArray()
                    sender.send(DatagramPacket(bytes, bytes.size, InetAddress.getByName("127.0.0.1"), 47210))
                }
                if (done.await(50, TimeUnit.MILLISECONDS)) return@use
            }
        }
        assertTrue(done.await(3, TimeUnit.SECONDS))
        assertEquals(1, found.get())
        assertEquals(0, unexpected.get())
    }
}
