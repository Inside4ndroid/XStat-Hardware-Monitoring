package net.xstat.companion

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Full-screen WebView that loads the XStat panel served by the .NET service.
 *
 * While the panel is displayed a background health monitor pings /health every
 * [HEALTH_INTERVAL_MS] ms. After [MAX_FAILURES] consecutive failures it
 * concludes the host has gone away and restarts SplashActivity so discovery
 * runs again automatically.
 *
 * Extras:
 *   EXTRA_URL  — fully-qualified URL discovered by DiscoveryManager,
 *                e.g. "http://192.168.1.100:9421"
 *                If absent/null the error view is shown immediately.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_URL = "net.xstat.companion.EXTRA_URL"
        private const val HEALTH_INTERVAL_MS = 1_000L
        private const val MAX_FAILURES = 3
    }

    private lateinit var webView: WebView
    private lateinit var errorView: View
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button

    private val mainHandler = Handler(Looper.getMainLooper())
    private val monitorRunning = AtomicBoolean(false)
    private var consecutiveFailures = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full-screen immersive — hide status bar + nav bar
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        hideSystemUi()

        setContentView(R.layout.activity_main)

        webView     = findViewById(R.id.webView)
        errorView   = findViewById(R.id.errorView)
        errorText   = findViewById(R.id.errorText)
        retryButton = findViewById(R.id.retryButton)

        configureWebView()

        val url = intent.getStringExtra(EXTRA_URL)
        if (url != null) {
            loadUrl(url)
            startConnectionMonitor(url)
        } else {
            showError(getString(R.string.error_no_host))
        }

        retryButton.setOnClickListener { restartApp() }
    }

    // ── Connection monitor ──────────────────────────────────────────────────

    private fun startConnectionMonitor(baseUrl: String) {
        monitorRunning.set(true)
        consecutiveFailures = 0
        scheduleHealthCheck(baseUrl)
    }

    private fun scheduleHealthCheck(baseUrl: String) {
        mainHandler.postDelayed({
            if (!monitorRunning.get()) return@postDelayed
            Thread {
                val healthy = pingHealth(baseUrl)
                mainHandler.post {
                    if (!monitorRunning.get()) return@post
                    if (healthy) {
                        consecutiveFailures = 0
                        scheduleHealthCheck(baseUrl)
                    } else {
                        consecutiveFailures++
                        if (consecutiveFailures >= MAX_FAILURES) {
                            // Host has gone away — restart discovery
                            monitorRunning.set(false)
                            restartApp()
                        } else {
                            scheduleHealthCheck(baseUrl)
                        }
                    }
                }
            }.apply { isDaemon = true; start() }
        }, HEALTH_INTERVAL_MS)
    }

    private fun pingHealth(baseUrl: String): Boolean {
        return try {
            val conn = URL("$baseUrl/health").openConnection() as HttpURLConnection
            conn.connectTimeout = 3_000
            conn.readTimeout    = 3_000
            conn.requestMethod  = "GET"
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (_: Exception) {
            false
        }
    }

    private fun stopConnectionMonitor() {
        monitorRunning.set(false)
        mainHandler.removeCallbacksAndMessages(null)
    }

    // ── WebView ─────────────────────────────────────────────────────────────

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        with(webView.settings) {
            javaScriptEnabled        = true
            domStorageEnabled        = true
            databaseEnabled          = true
            loadsImagesAutomatically = true
            mixedContentMode         = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode                = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            allowContentAccess       = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false

            // Catches main-frame load errors (deprecated path, API < 23)
            @Suppress("OVERRIDE_DEPRECATION")
            override fun onReceivedError(
                view: WebView,
                errorCode: Int,
                description: String,
                failingUrl: String
            ) {
                showError(getString(R.string.error_load_failed, description))
            }
        }
    }

    private fun loadUrl(url: String) {
        errorView.visibility = View.GONE
        webView.visibility   = View.VISIBLE
        webView.loadUrl(url)
    }

    private fun showError(message: String) {
        stopConnectionMonitor()
        webView.visibility   = View.GONE
        errorView.visibility = View.VISIBLE
        errorText.text       = message
    }

    // ── Navigation & lifecycle ──────────────────────────────────────────────

    private fun restartApp() {
        stopConnectionMonitor()
        val intent = Intent(this, SplashActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopConnectionMonitor()
    }

    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}

