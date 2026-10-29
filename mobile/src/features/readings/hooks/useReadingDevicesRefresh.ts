import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listReadingDevices } from "../../../api/services/readings.service";
import type { ApiReadingDevice } from "../types/readings.types";

/** Refresh only the data, preserving filters, scrolling and modal visibility. */
export function useReadingDevicesRefresh(onDevices: (devices: ApiReadingDevice[]) => void, paused: boolean) {
  useFocusEffect(useCallback(() => {
    let focused = true;
    let working = false;
    const refreshReadings = async () => {
      if (paused || working || AppState.currentState !== "active") return;
      working = true;
      try {
        const devices = await listReadingDevices();
        if (focused) onDevices(devices);
      } catch {
        // A failed background refresh keeps the last successful readings visible.
      } finally {
        working = false;
      }
    };
    const timer = setInterval(refreshReadings, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshReadings();
    });
    return () => {
      focused = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [onDevices, paused]));
}
