import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import HistoryChart from "../HistoryChart";
import { historyValue } from "../../utils/historyValue";

it("shows real zero and negative readings without manufacturing bars for missing samples", () => {
  const view = render(<HistoryChart labels={["1", "2", "3"]} values={[null, 0, -5]} height={200} color="#fff" unit="°C" labelMode="all" />);
  expect(view.getByTestId("history-gap-0")).toBeTruthy();
  expect(view.queryByTestId("history-bar-0")).toBeNull();
  expect(view.getByText("0")).toBeTruthy();
  expect(view.getByText("-5")).toBeTruthy();
  expect(view.getByTestId("history-chart-unit").props.children).toBe("°C");
  expect(parseFloat(StyleSheet.flatten(view.getByTestId("history-bar-2").props.style).height)).toBeGreaterThan(0);
});
it("lets a measured zero label be toggled like other samples", () => {
  const view = render(<HistoryChart labels={["01"]} values={[0]} height={200} color="#fff" labelMode="hidden" />);
  expect(view.queryByText("0")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "0" }));
  expect(view.getByText("0")).toBeTruthy();
});
it("keeps zero-filled legacy responses compatible and distinguishes new sample counts", () => {
  expect(historyValue({ at: "hour", value: 0 })).toBeNull();
  expect(historyValue({ at: "hour", value: null, sample_count: 0 })).toBeNull();
  expect(historyValue({ at: "hour", value: 0, sample_count: 1 })).toBe(0);
  expect(historyValue({ at: "hour", value: -5, sample_count: 1 })).toBe(-5);
});
