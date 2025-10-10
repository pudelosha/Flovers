import { NativeEventEmitter, NativeModules, Platform } from "react-native";

export type LuxEvent = { lux: number };

type NativeLightModule = {
  isAvailable: () => Promise<boolean>;
  start: () => void;
  stop: () => void;
};

const LINKING_ERROR =
  `LightSensorModule native module not found. Did you rebuild the app?`;

const M = (NativeModules.LightSensorModule ?? null) as NativeLightModule | null;

// We emit via DeviceEventManagerModule from Android native, so do NOT pass a module here.
// Passing a module without addListener/removeListeners causes the RN warning.
const emitter = new NativeEventEmitter();

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
  events: emitter,
};
