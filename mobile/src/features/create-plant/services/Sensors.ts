import { Platform } from "react-native";
import { LightSensor, LuxEvent } from "../../../native/LightSensorModule";

// Magnetometer from react-native-sensors (already in your project)
type MagnetometerReading = { x: number; y: number; z: number };

// Public, shared API
export type CompassSubscription = { unsubscribe: () => void };
export type LightSubscription = { remove: () => void };

export const Sensors = {
  // ---- Compass (all platforms via react-native-sensors)
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

  // ---- Light (Android native module, no-op elsewhere)
  startLight: async (
    onLux: (lux: number) => void
  ): Promise<LightSubscription | null> => {
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
