package com.mobile.sensors

import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.Context
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LightSensorModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var lightSensor: Sensor? = null
  private var isListening: Boolean = false

  override fun getName() = "LightSensorModule"

  override fun initialize() {
    super.initialize()
    sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    lightSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_LIGHT)
  }

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(lightSensor != null)
  }

  @ReactMethod
  fun start() {
    if (isListening || lightSensor == null) return
    sensorManager?.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL)
    isListening = true
  }

  @ReactMethod
  fun stop() {
    if (!isListening) return
    sensorManager?.unregisterListener(this)
    isListening = false
  }

  override fun onSensorChanged(event: SensorEvent?) {
    if (event?.sensor?.type == Sensor.TYPE_LIGHT) {
      val lux = event.values[0] // ambient light in lx
      val params = Arguments.createMap().apply { putDouble("lux", lux.toDouble()) }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("LightSensorModule.onLux", params)
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    stop()
  }
}
