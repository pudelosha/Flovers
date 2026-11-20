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
      val smokeClientFactory = com.facebook.react.modules.network.OkHttpClientFactory {
        com.facebook.react.modules.network.OkHttpClientProvider.createClientBuilder()
          // Do not let a loopback response redirect the smoke app to another host.
          .followRedirects(false)
          .followSslRedirects(false)
          .addInterceptor { chain ->
            val host = chain.request().url.host
            if (host != "10.0.2.2" || chain.request().url.port != 8000 || chain.request().url.scheme != "http") {
              throw java.io.IOException("E2E network policy denied external host: $host")
            }
            android.util.Log.i("FloversE2E", "HTTP ${chain.request().method} ${chain.request().url.encodedPath}")
            try {
              chain.proceed(chain.request())
            } catch (error: java.io.IOException) {
              android.util.Log.e("FloversE2E", "Disposable API connection failed", error)
              throw error
            }
          }.build()
      }
      com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory(smokeClientFactory)
      // Verify the actual client factory and generated endpoint in the installed APK.
      // .invalid is deliberately non-routable and is rejected before DNS/HTTP.
      Thread({
        val forbidden = "http://flovers-e2e-forbidden.invalid/"
        try {
          val apiBase = BuildConfig::class.java.getField("API_BASE").get(null)
          check(apiBase == "http://10.0.2.2:8000") { "Unexpected E2E API_BASE: $apiBase" }
          smokeClientFactory.createNewNetworkModuleClient().newCall(
            okhttp3.Request.Builder().url(forbidden).build()
          ).execute().use { throw IllegalStateException("E2E external request was not blocked") }
        } catch (error: java.io.IOException) {
          if (error.message == "E2E network policy denied external host: flovers-e2e-forbidden.invalid") {
            android.util.Log.i("FloversE2E", "Isolation verified: emulator host API; external request blocked before DNS")
          } else {
            android.util.Log.e("FloversE2E", "Isolation verification failed", error)
          }
        } catch (error: Exception) {
          android.util.Log.e("FloversE2E", "Isolation verification failed", error)
        }
        try {
          val call = smokeClientFactory.createNewNetworkModuleClient().newCall(
            okhttp3.Request.Builder().url("http://10.0.2.2:8000/auth/login/")
              .method("OPTIONS", null).build()
          )
          call.timeout().timeout(10, java.util.concurrent.TimeUnit.SECONDS)
          call.execute().use { response ->
            check(response.code == 200) { "Unexpected disposable API status: ${response.code}" }
            android.util.Log.i("FloversE2E", "Disposable backend verified: HTTP 200")
          }
        } catch (error: Exception) {
          android.util.Log.e("FloversE2E", "Backend verification failed", error)
        }
      }, "FloversE2E-isolation").start()
    }
    com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative(this)
  }
}
