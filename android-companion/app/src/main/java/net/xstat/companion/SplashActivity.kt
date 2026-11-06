package net.xstat.companion

import android.animation.AnimatorInflater
import android.animation.AnimatorSet
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

/**
 * Splash screen that shows the XStat logo + animated pulse while the UDP
 * discovery runs in the background.  Transitions to MainActivity once a
 * host is found (or after a timeout triggers the "no host found" state
 * handled in MainActivity).
 */
class SplashActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val discovery by lazy { DiscoveryManager(this) }
    private var searchGeneration = 0
    private var launched = false
    private val animators = mutableListOf<AnimatorSet>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Keep the screen awake during discovery and automatic reconnection too.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_splash)

        // Start staggered pulse animations on the five dots
        val dotIds = listOf(R.id.dot1, R.id.dot2, R.id.dot3, R.id.dot4, R.id.dot5)
        dotIds.forEachIndexed { i, id ->
            val dot = findViewById<View>(id)
            val anim = AnimatorInflater.loadAnimator(this, R.animator.pulse_dot) as AnimatorSet
            anim.startDelay = (i * 120L)
            anim.setTarget(dot)
            anim.start()
            animators += anim
        }

    }

    override fun onStart() {
        super.onStart()
        val token = ++searchGeneration
        // Only a visible activity may consume this search result.
        discovery.findXStat(
            timeoutMs = 15_000L,
            onFound = { url ->
                handler.post {
                    if (token == searchGeneration) launchMain(url)
                }
            },
            onError = { error ->
                handler.post {
                    if (token == searchGeneration) launchMain(null, error.localizedMessage ?: "UDP discovery failed")
                }
            },
            onTimeout = {
                handler.post {
                    if (token == searchGeneration) launchMain(null)
                }
            }
        )
    }

    private fun launchMain(url: String?, error: String? = null) {
        if (launched || isFinishing || isDestroyed) return
        launched = true
        val intent = Intent(this, MainActivity::class.java)
        if (url != null) {
            intent.putExtra(MainActivity.EXTRA_URL, url)
        }
        if (error != null) intent.putExtra(MainActivity.EXTRA_ERROR, error)
        startActivity(intent)
        finish()
        // No transition animation — keeps the feel seamless
        overridePendingTransition(0, 0)
    }

    override fun onStop() {
        searchGeneration++
        discovery.cancel()
        handler.removeCallbacksAndMessages(null)
        super.onStop()
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        animators.forEach { it.cancel() }
        discovery.cancel()
    }
}
