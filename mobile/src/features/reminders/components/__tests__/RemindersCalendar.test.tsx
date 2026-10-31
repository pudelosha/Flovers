import React from "react";
import { BackHandler, Modal, ScrollView, StyleSheet, View } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";
import RemindersCalendar from "../RemindersCalendar";
import ReminderMiniTileMenu from "../ReminderMiniTileMenu";
import type { Reminder } from "../../types/reminders.types";

const mockNavigate = jest.fn();
const mockT = (key: string) => key;
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true, useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 20, left: 0, right: 0 }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: { language: "en" } }) }));
jest.mock("react-native-calendars", () => ({ LocaleConfig: { locales: {}, defaultLocale: "en" } }));
jest.mock("react-native-calendars/src/calendar", () => (props: any) => require("react").createElement(require("react-native").View, props));
jest.mock("../../../../app/providers/LanguageProvider", () => ({ useLanguage: () => ({ currentLanguage: "en" }) }));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { dateFormat: "YYYY-MM-DD" } }) }));

const reminder: Reminder = { id: "7", reminderId: "7", plantId: "4", plant: "Blueberry", location: "Balcony",
  type: "watering", dueDate: "2026-10-31T12:00:00Z", dueDateISO: "2026-10-31", isActive: true, intervalValue: 7, intervalUnit: "days" };
const edit = jest.fn(), remove = jest.fn(), toggle = jest.fn();
function Harness({ date = "2026-10-31" }: { date?: string }) {
  const [id, setId] = React.useState<string | null>(null);
  return <RemindersCalendar reminders={[reminder]} selectedDate={date} openMenuId={id}
    onSelectDate={jest.fn()} onToggleMenu={value => setId(previous => previous === value || !value ? null : value)}
    onEdit={edit} onDelete={remove} onToggleActive={toggle} />;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(View.prototype, "measureInWindow").mockImplementation(function (this: any, callback) {
    this.props.testID === "reminders-calendar-host" ? callback(0, 100, 360, 680) : callback(20, 10000, 320, 70);
  });
});
afterEach(() => jest.restoreAllMocks());
function open() {
  const view = render(<Harness />);
  fireEvent.press(view.getByText("Blueberry"));
  return view;
}

it("renders the full menu outside the clipped card without a native window that changes Android system bars", () => {
  const view = open();
  expect(within(view.getByTestId("reminders-calendar-card", { includeHiddenElements: true })).UNSAFE_queryByType(ReminderMiniTileMenu)).toBeNull();
  expect(within(view.getByTestId("calendar-reminder-menu-overlay")).UNSAFE_getByType(ReminderMiniTileMenu)).toBeTruthy();
  expect(view.UNSAFE_queryByType(Modal)).toBeNull();
  expect(view.getByText("Edit reminder")).toBeTruthy();
  expect(view.getByText("Pause reminder")).toBeTruthy();
  expect(view.getByText("Plant details")).toBeTruthy();
  expect(view.getByText("Delete reminder")).toBeTruthy();
});

it("repositions a last-row menu above the bottom navigation after measuring its full height", () => {
  const view = open();
  const menu = view.UNSAFE_getByType(ReminderMiniTileMenu);
  fireEvent(menu, "layout", { nativeEvent: { layout: { height: 190 } } });
  const position = StyleSheet.flatten(view.UNSAFE_getByType(ReminderMiniTileMenu).props.style);
  expect(position.top).toBeGreaterThanOrEqual(8);
  expect(position.top + 190).toBeLessThanOrEqual(680 - 64 - 20 - 12);
});

it.each([
  ["Edit reminder", edit], ["Pause reminder", toggle], ["Delete reminder", remove],
])("keeps %s tappable and closes the menu before acting", (label, action) => {
  const view = open(); fireEvent.press(view.getByText(label));
  expect(action).toHaveBeenCalledWith(reminder);
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
});

it("opens the correct plant and dismisses the floating menu", () => {
  const view = open(); fireEvent.press(view.getByText("Plant details"));
  expect(mockNavigate).toHaveBeenCalledWith("PlantDetails", { id: "4" });
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
});

it("dismisses on an outside tap, Android Back, or calendar scrolling", () => {
  const back = jest.spyOn(BackHandler, "addEventListener");
  const view = open();
  fireEvent.press(view.getByTestId("calendar-reminder-menu-backdrop"));
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
  fireEvent.press(view.getByText("Blueberry"));
  act(() => { expect(back.mock.calls[back.mock.calls.length - 1][1]()).toBe(true); });
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
  fireEvent.press(view.getByText("Blueberry"));
  fireEvent(view.UNSAFE_getAllByType(ScrollView)[0], "scrollBeginDrag");
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
});

it("does not reopen a delayed measurement after scrolling canceled it", () => {
  let measure: any;
  (View.prototype.measureInWindow as jest.Mock).mockImplementation(callback => { measure = callback; });
  const view = render(<Harness />);
  fireEvent.press(view.getByText("Blueberry"));
  fireEvent(view.UNSAFE_getAllByType(ScrollView)[0], "scrollBeginDrag");
  act(() => measure(20, 10000, 320, 70));
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
});

it("hides a menu when changing the selected date", () => {
  const view = open(); view.rerender(<Harness date="2026-11-01" />);
  expect(view.queryByTestId("calendar-reminder-menu-overlay")).toBeNull();
});


it("raises the calendar menu without casting a shadow over the floating button layer", () => {
  const view = open();
  const host = view.getByTestId("reminders-calendar-host");
  expect(StyleSheet.flatten(host.props.style).elevation).toBe(0);
  expect(view.UNSAFE_queryByType(Modal)).toBeNull();
});
