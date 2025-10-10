// native/HeadingModule.ts
import { NativeModules, NativeEventEmitter, Platform } from "react-native";

type NativeHeadingModule = {
  start: (hz: number) => Promise<boolean>;
  stop: () => Promise<boolean>;
  setSmoothing: (alpha: number) => void;
  setDeclination: (deg: number) => void;
};

const M = (Platform.OS === "android"
  ? (NativeModules.HeadingModule as NativeHeadingModule | undefined)
  : undefined);

// No module param => avoids addListener/removeListeners warnings
const emitter = new NativeEventEmitter();

export const Heading = {
  available: !!M,
  start: async (hz = 20) => { if (M) return M.start(hz); return false; },
  stop: async () => { if (M) return M.stop(); return false; },
  setSmoothing: (a: number) => { if (M) M.setSmoothing(a); },
  setDeclination: (d: number) => { if (M) M.setDeclination(d); },
  events: emitter, // will receive "headingDidChange" from the native side
};
