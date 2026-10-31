import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import Screen from "../ReadingsHistoryScreen";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import HistoryChart from "../../components/HistoryChart";
import MetricPills from "../../components/MetricPills";
import DateNavigator from "../../components/DateNavigator";
import HistorySegmented from "../../components/HistorySegmented";
import { listReadingDevices, fetchReadingsHistory } from "../../../../api/services/readings.service";

const mockT = (key: string) => key;
let mockFocus: () => () => void;
const mockNav = { navigate: jest.fn() };
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: { language: "en" } }) }));
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockNav, useRoute: () => ({ params: {} }), useFocusEffect: (effect: any) => { mockFocus = effect; } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 10 }) }));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { dateFormat: "YYYY-MM-DD", temperatureUnit: "C" } }) }));
jest.mock("../../../../api/services/readings.service", () => ({ listReadingDevices: jest.fn(), fetchReadingsHistory: jest.fn() }));
jest.mock("../../components/HistoryChart", () => () => null);
jest.mock("../../components/HistorySegmented", () => () => null);
jest.mock("../../components/MetricPills", () => () => null);
jest.mock("../../components/DateNavigator", () => () => null);
jest.mock("../../components/modals/DeleteReadingsModal", () => () => null);
jest.mock("../../../../shared/ui/GlassHeader", () => () => null);
jest.mock("../../../../shared/ui/TopSnackbar", () => () => null);
const layout = (height: number) => ({ nativeEvent: { layout: { width: 360, height, x: 0, y: 0 } } });

it("waits on entry, keeps the existing tile during criteria refresh, and waits again on return", async () => {
  jest.useFakeTimers();
  let finish: any;
  (listReadingDevices as jest.Mock).mockResolvedValue([{ id: 1, device_name: "Device", plant_name: "Blueberry" }]);
  (fetchReadingsHistory as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<Screen />);
  await act(async () => {});
  const content = () => view.getByTestId("readings-history-content", { includeHiddenElements: true });
  expect(content().props.pointerEvents).toBe("none");
  fireEvent(content(), "layout", layout(700));
  for (const [name, height] of [["seg", 50], ["name", 40], ["date", 40], ["pills", 50]] as const) {
    fireEvent(view.getByTestId(`readings-history-${name}`, { includeHiddenElements: true }), "layout", layout(height));
  }
  const chart = () => view.UNSAFE_getByType(HistoryChart);
  fireEvent(view.getByTestId("readings-history-chart-layout", { includeHiddenElements: true }), "layout", layout(chart().props.height + 50));
  act(() => { jest.advanceTimersByTime(80); });
  expect(content().props.pointerEvents).toBe("none");
  await act(async () => finish({ points: [] }));
  expect(content().props.pointerEvents).toBe("none");
  act(() => { jest.advanceTimersByTime(80); });
  expect(content().props.pointerEvents).toBe("auto");
  expect(chart().props.height).toBe(324); // 700 - custom tabs 74 - outer gaps 42 - controls 180 - inner 30 - chrome 50
  fireEvent(content(), "layout", layout(600));
  expect(content().props.pointerEvents).toBe("auto");
  act(() => { jest.advanceTimersByTime(80); });
  expect(content().props.pointerEvents).toBe("auto");
  expect(chart().props.height).toBe(224);
  const opacity = StyleSheet.flatten(content().props.style).opacity;
  act(() => view.UNSAFE_getByType(HistorySegmented).props.onChange("week"));
  expect(content().props.pointerEvents).toBe("auto");
  expect(StyleSheet.flatten(content().props.style).opacity).toBe(opacity);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  await act(async () => finish({ points: [] }));
  expect(content().props.pointerEvents).toBe("auto");
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  for (const change of [
    () => view.UNSAFE_getByType(MetricPills).props.onChange("light"),
    () => view.UNSAFE_getByType(DateNavigator).props.onPrev(),
  ]) {
    act(change);
    expect(content().props.pointerEvents).toBe("auto");
    expect(StyleSheet.flatten(content().props.style).opacity).toBe(opacity);
    expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
    await act(async () => finish({ points: [] }));
    expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  }
  act(() => { mockFocus(); }); // Return to the screen: reset the entry latch.
  expect(content().props.pointerEvents).toBe("none");
  expect(StyleSheet.flatten(content().props.style).opacity).toBe(0);
  await act(async () => finish({ points: [] }));
  act(() => { jest.advanceTimersByTime(80); });
  expect(content().props.pointerEvents).toBe("auto");
  view.unmount();
  jest.useRealTimers();
});
