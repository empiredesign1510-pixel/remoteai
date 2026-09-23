package com.example.orbitremote

import android.content.Context
import android.hardware.ConsumerIrManager
import android.webkit.JavascriptInterface

class AndroidIRBridge(context: Context) {
    private val ir = context.getSystemService(Context.CONSUMER_IR_SERVICE) as ConsumerIrManager

    @JavascriptInterface
    fun hasEmitter(): Boolean = ir.hasIrEmitter()

    @JavascriptInterface
    fun transmit(frequency: Int, patternCsv: String) {
        require(frequency in 20_000..60_000) { "Invalid IR frequency" }
        val pattern = patternCsv
            .split(',')
            .map { it.trim().toInt() }
            .filter { it > 0 }
            .toIntArray()

        require(pattern.isNotEmpty() && pattern.size <= 2048) { "Invalid pattern" }
        ir.transmit(frequency, pattern)
    }
}

// Di Activity/WebView:
// webView.settings.javaScriptEnabled = true
// webView.addJavascriptInterface(AndroidIRBridge(this), "AndroidIR")
// webView.loadUrl("file:///android_asset/www/index.html")
