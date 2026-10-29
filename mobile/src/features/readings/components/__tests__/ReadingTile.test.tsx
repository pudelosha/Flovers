import React from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { act, render } from "@testing-library/react-native";
import ReadingTile from "../ReadingTile";
import type { ReadingTileModel } from "../../types/readings.types";

const data: ReadingTileModel = {
  id: "1", name: "Fern", status: "enabled", lastReadISO: "2026-10-29T10:00:00Z",
  createdAtISO: "2026-10-29T09:00:00Z", intervalMinutes: 60,
  metrics: { temperature: 21, humidity: 50, light: 30, moisture: 40 },
  location: "Bedroom", pumpIncluded: false, automaticPumpLaunch: false,
};
const callbacks = { isMenuOpen: false, onPressBody: jest.fn(), onPressMenu: jest.fn(),
  onEdit: jest.fn(), onDeviceDetails: jest.fn(), onHistory: jest.fn(), onPlantDetails: jest.fn(),
  onDelete: jest.fn(), onMetricPress: jest.fn() };

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-29T10:59:59Z")); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it("starts pulsing at the deadline without another server refresh and stops after a fresh reading", () => {
  const view = render(<ReadingTile data={data} {...callbacks} />);
  expect(view.queryByTestId("missing-readings-pulse")).toBeNull();
  act(() => jest.advanceTimersByTime(1000));
  expect(view.getByTestId("missing-readings-pulse")).toBeTruthy();
  expect(view.getByText("Readings overdue")).toBeTruthy();
  view.rerender(<ReadingTile data={{ ...data, lastReadISO: "2026-10-29T11:00:00Z" }} {...callbacks} />);
  expect(view.queryByTestId("missing-readings-pulse")).toBeNull();
  expect(view.queryByText("Readings overdue")).toBeNull();
  view.unmount();
});

it("does not pulse a disabled device even when its last reading is old", () => {
  const view = render(<ReadingTile data={{ ...data, status: "disabled" }} {...callbacks} />);
  act(() => jest.advanceTimersByTime(3600_000));
  expect(view.queryByTestId("missing-readings-pulse")).toBeNull();
  view.unmount();
});

it("rechecks the clock on foreground and removes its listener on unmount", () => {
  let activate: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    activate = listener;
    return { remove };
  });
  const view = render(<ReadingTile data={data} {...callbacks} />);
  act(() => {
    jest.setSystemTime(new Date("2026-10-29T11:05:00Z"));
    activate?.("active");
  });
  expect(view.getByTestId("missing-readings-pulse")).toBeTruthy();
  view.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});
