import { Platform } from "react-native";
import { LightSensor, LuxEvent } from "../../../native/LightSensorModule";
import { Heading } from "../../../native/HeadingModule";

// Public, shared API
export type CompassSubscription = { unsubscribe: () => void };
export type LightSubscription = { remove: () => void };

type MagnetometerReading = { x: number; y: number; z: number };

export const Sensors = {
  // ---- Tilt-invariant heading: Android uses HeadingModule; others fallback to magnetometer ----
  startHeading: async (onDeg: (deg: number) => void): Promise<CompassSubscription | null> => {
    if (Platform.OS === "android" && Heading.available) {
      await Heading.start(20);
      const sub = Heading.events.addListener("headingDidChange", (evt: { heading?: number }) => {
        if (typeof evt?.heading === "number") onDeg(evt.heading);
      });
      return { unsubscribe: () => { try { sub.remove(); Heading.stop(); } catch {} } };
    }

    // Fallback: compute heading from magnetometer x/y (no tilt compensation)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { magnetometer, SensorTypes, setUpdateIntervalForType } = require("react-native-sensors");
      setUpdateIntervalForType?.(SensorTypes.magnetometer, 200);
      const sub = magnetometer.subscribe((r: MagnetometerReading) => {
        // Basic 2D azimuth fallback: atan2(-x, y)
        let deg = (Math.atan2(-r.x, r.y) * 180) / Math.PI;
        if (deg < 0) deg += 360;
        onDeg(Math.round(deg));
      });
      return { unsubscribe: () => sub?.unsubscribe?.() };
    } catch {
      return null;
    }
  },

  // ---- Light (Android native module, no-op elsewhere) ----
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
