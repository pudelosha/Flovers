// services/Sensors.ts
import { Platform, NativeModules, NativeEventEmitter } from "react-native";
import { LightSensor, LuxEvent } from "../../../native/LightSensorModule";

// Magnetometer from react-native-sensors (already in your project)
type MagnetometerReading = { x: number; y: number; z: number };

// Public, shared API
export type CompassSubscription = { unsubscribe: () => void };
export type LightSubscription = { remove: () => void };

// --- Native heading module (tilt-compensated via Android Rotation Vector)
const HeadingNative = (NativeModules as any)?.HeadingModule || null;
const headingEmitter = HeadingNative ? new NativeEventEmitter() : null;

export const Sensors = {
  // ---- Compass (fallback / legacy via react-native-sensors)
  startCompass: (onReading: (r: MagnetometerReading) => void): CompassSubscription | null => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Magnetometer, SensorTypes, setUpdateIntervalForType } = require("react-native-sensors");
      setUpdateIntervalForType(SensorTypes.magnetometer, 250);
      const sub = Magnetometer.subscribe(onReading);
      return { unsubscribe: () => sub?.unsubscribe?.() };
    } catch {
      return null;
    }
  },

  // ---- NEW: Native tilt-compass (Android only) 0..360 (0=N,90=E,180=S,270=W)
  startCompassNative: async (
    onHeadingDeg: (deg: number) => void,
    opts: { hz?: number; smoothing?: number; declination?: number } = {}
  ): Promise<{ remove: () => void } | null> => {
    if (Platform.OS !== "android" || !HeadingNative || !headingEmitter) return null;

    if (typeof opts.smoothing === "number") {
      try { await HeadingNative.setSmoothing(opts.smoothing); } catch {}
    }
    if (typeof opts.declination === "number") {
      try { await HeadingNative.setDeclination(opts.declination); } catch {}
    }

    const sub = headingEmitter.addListener("headingDidChange", (e: { heading: number }) => {
      if (typeof e?.heading === "number") onHeadingDeg(e.heading);
    });

    try {
      await HeadingNative.start(opts.hz ?? 15); // 15 Hz by default
    } catch (e) {
      try { sub.remove(); } catch {}
      return null;
    }

    return {
      remove: () => {
        try { sub.remove(); } catch {}
        try { HeadingNative.stop(); } catch {}
      },
    };
  },

  // ---- Light (Android native module, no-op elsewhere)
  startLight: async (onLux: (lux: number) => void): Promise<LightSubscription | null> => {
    if (Platform.OS !== "android") return null;
    const available = await LightSensor.isAvailable();
    if (!available) return null;

    const listener = LightSensor.events.addListener("LightSensorModule.onLux", (evt: LuxEvent) => {
      if (typeof evt?.lux === "number") onLux(evt.lux);
    });

    LightSensor.start();

    return {
      remove: () => {
        try {
          listener.remove();
          LightSensor.stop();
        } catch {}
      },
    };
  },
};
