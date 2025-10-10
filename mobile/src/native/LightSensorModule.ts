import { NativeEventEmitter, NativeModules, Platform } from "react-native";

type LuxEvent = { lux: number };

type NativeLightModule = {
  isAvailable: () => Promise<boolean>;
  start: () => void;
  stop: () => void;
};

const LINKING_ERROR =
  `LightSensorModule native module not found. Did you rebuild the app?`;

const M = (NativeModules.LightSensorModule ?? null) as NativeLightModule | null;

export const LightSensor = {
  isAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !M) return false;
    try {
      return await M.isAvailable();
    } catch {
      return false;
    }
  },
  start: (): void => {
    if (Platform.OS !== "android" || !M) return;
    M.start();
  },
  stop: (): void => {
    if (Platform.OS !== "android" || !M) return;
    M.stop();
  },
  events: new NativeEventEmitter(
    (NativeModules.LightSensorModule ?? undefined) as any
  ),
};

export type { LuxEvent };
