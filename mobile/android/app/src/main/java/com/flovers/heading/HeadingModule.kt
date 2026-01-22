package com.flovers.heading

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class HeadingModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var rotationSensor: Sensor? = null

  // State
  private var started = false
  private var smoothing = 0.25f   // circular EMA factor
  private var declination = 0.0f  // magnetic -> true north correction (deg)
  private var lastHeading: Float? = null

  override fun getName(): String = "HeadingModule"

  @ReactMethod
  fun setSmoothing(alpha: Double) {
    val a = alpha.toFloat()
    smoothing = when {
      a < 0f -> 0f
      a > 0.95f -> 0.95f
      else -> a
    }
  }

  @ReactMethod
  fun setDeclination(deg: Double) {
    declination = deg.toFloat()
  }

  @ReactMethod
  fun start(hz: Int, promise: Promise) {
    if (started) {
      promise.resolve(true)
      return
    }
    try {
      sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

      // Prefer Rotation Vector (fused), fallback to Game Rotation Vector
      rotationSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
      if (rotationSensor == null) {
        rotationSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR)
      }
      if (rotationSensor == null) {
        promise.reject("E_NO_SENSOR", "No rotation vector sensor available")
        return
      }

      val delayUs = if (hz <= 0) SensorManager.SENSOR_DELAY_GAME
      else (1_000_000f / hz.coerceIn(1, 60)).toInt()

      sensorManager?.registerListener(this, rotationSensor, delayUs)
      started = true
      promise.resolve(true)
    } catch (e: Exception) {
      started = false
      promise.reject("E_START", e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      sensorManager?.unregisterListener(this)
      started = false
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_STOP", e)
    }
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (!started) return
    val t = event.sensor.type
    if (t != Sensor.TYPE_ROTATION_VECTOR && t != Sensor.TYPE_GAME_ROTATION_VECTOR) return

    // Build rotation matrix from the rotation vector
    val R = FloatArray(9)
    SensorManager.getRotationMatrixFromVector(R, event.values)

    // Remap for a phone laying flat, screen up:
    // We want azimuth based on the device's TOP EDGE direction regardless of pitch/tilt.
    val outR = FloatArray(9)
    SensorManager.remapCoordinateSystem(
      R,
      SensorManager.AXIS_X, // device X (to the right)
      SensorManager.AXIS_Y, // device Y (to the top edge)
      outR
    )

    // Get azimuth/pitch/roll
    val orientation = FloatArray(3)
    SensorManager.getOrientation(outR, orientation)
    var azimuthDeg = Math.toDegrees(orientation[0].toDouble()).toFloat() // -180..180

    // Convert to 0..360 and apply declination
    if (azimuthDeg < 0f) azimuthDeg += 360f
    azimuthDeg = (azimuthDeg + declination) % 360f
    if (azimuthDeg < 0f) azimuthDeg += 360f

    // Circular EMA smoothing in native
    val smoothed = smoothCircular(lastHeading, azimuthDeg, smoothing)
    lastHeading = smoothed

    // Emit to JS
    val map = Arguments.createMap().apply { putDouble("heading", smoothed.toDouble()) }
    reactContext
      .getJSModule(RCTDeviceEventEmitter::class.java)
      .emit("headingDidChange", map)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // no-op
  }

  /** Circular EMA on degrees (0..360), shortest-arc */
  private fun smoothCircular(prev: Float?, next: Float, alpha: Float): Float {
    if (prev == null) return next
    var delta = next - prev
    if (delta > 180f) delta -= 360f
    if (delta < -180f) delta += 360f
    var s = prev + alpha * delta
    if (s < 0f) s += 360f
    if (s >= 360f) s -= 360f
    return s
  }
}
