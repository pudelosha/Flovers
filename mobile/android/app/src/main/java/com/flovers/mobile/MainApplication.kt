package com.flovers.mobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.flovers.mobile.sensors.LightSensorPackage
import com.flovers.mobile.heading.HeadingPackage
import com.flovers.mobile.appearance.SystemBarsPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {

      override fun getPackages() =
        PackageList(this).packages.apply {
          // Manually linked packages
          add(LightSensorPackage())
          add(HeadingPackage())
          add(SystemBarsPackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean =
        BuildConfig.DEBUG

      override val isNewArchEnabled: Boolean =
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

      override val isHermesEnabled: Boolean =
        BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // Fail closed before DNS/HTTP for any accidental external URL in the CI APK.
    // Default debug/release behavior is unchanged.
    if (BuildConfig.BUILD_TYPE == "e2e") {
      com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory {
        com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder()
          .addInterceptor { chain ->
            val host = chain.request().url.host
            if (host != "127.0.0.1" && host != "localhost") {
              throw java.io.IOException("E2E network policy denied external host: $host")
            }
            chain.proceed(chain.request())
          }.build()
      }
    }
    com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative(this)
  }
}
