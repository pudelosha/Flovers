package com.flovers.mobile.appearance

import android.os.Build
import android.graphics.Color
import android.view.View
import android.view.WindowInsetsController
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SystemBarsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "FloversSystemBars"

  @ReactMethod
  fun setLightAppearance(light: Boolean) {
    reactApplicationContext.currentActivity?.runOnUiThread {
      val window = reactApplicationContext.currentActivity?.window ?: return@runOnUiThread
      @Suppress("DEPRECATION")
      window.navigationBarColor = if (light) Color.rgb(229, 242, 236) else Color.rgb(5, 38, 31)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) window.isNavigationBarContrastEnforced = false
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val flags = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        window.insetsController?.setSystemBarsAppearance(if (light) flags else 0, flags)
      } else {
        @Suppress("DEPRECATION")
        var flags = window.decorView.systemUiVisibility
        val mask = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0)
        flags = if (light) flags or mask else flags and mask.inv()
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = flags
      }
    }
  }
}
