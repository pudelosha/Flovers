import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import ProfileScreen from "../ProfileScreen";
import { DEFAULT_SETTINGS } from "../../../../app/settings/settings.defaults";
import { fetchProfileNotifications, updateProfileNotifications } from "../../../../api/services/profile.service";

const mockT = (key: string) => key;
let mockSettings = { settings: DEFAULT_SETTINGS, loading: false, applyServerSettings: jest.fn() };
let mockAccountLevel: any = { progress: null, loading: true };
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    require("react").useEffect(callback, [callback]);
  },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("../../../../app/providers/useAuth", () => ({
  useAuth: () => ({ user: { id: 12, email: "profile@example.test" }, logout: jest.fn() }),
}));
jest.mock("../../../../app/providers/SettingsProvider", () => ({
  useSettings: () => mockSettings,
}));
jest.mock("../../hooks/useAccountLevel", () => ({
  useAccountLevel: () => mockAccountLevel,
}));
jest.mock("../../../../api/services/profile.service", () => ({
  fetchProfileNotifications: jest.fn(),
  updateProfileNotifications: jest.fn(),
  updateProfileSettings: jest.fn(),
}));
jest.mock("../../../../shared/ui/CenteredSpinner", () => (props: any) =>
  require("react").createElement(require("react-native").Text, { testID: "shared-spinner" }, "Loading"));
jest.mock("../../../../shared/ui/GlassHeader", () => (props: any) =>
  require("react").createElement(require("react-native").Text, null, props.title));
jest.mock("../../components/AccountCard", () => (props: any) =>
  require("react").createElement(require("react-native").Text, null, "Account level " + (props.levelProgress?.level ?? "unavailable")));
jest.mock("../../components/NotificationsCard", () => (props: any) => {
  const React = require("react"), { View, Text, Pressable } = require("react-native");
  return <View><Text>{"Notifications " + props.emailDaily}</Text>
    <Text testID="shared-consent">{`${props.sharedTaskEmail}:${props.sharedTaskPush}`}</Text>
    <Text testID="shared-due-consent">{`${props.emailSharedDue}:${props.pushSharedDue}`}</Text>
    <Pressable onPress={() => props.setSharedTaskEmail((value: boolean) => !value)}><Text>toggle-shared-email</Text></Pressable>
    <Pressable onPress={() => props.setSharedTaskPush((value: boolean) => !value)}><Text>toggle-shared-push</Text></Pressable>
    <Pressable onPress={() => props.setEmailSharedDue((value: boolean) => !value)}><Text>toggle-shared-due-email</Text></Pressable>
    <Pressable onPress={() => props.setPushSharedDue((value: boolean) => !value)}><Text>toggle-shared-due-push</Text></Pressable>
    <Pressable onPress={props.onSave}><Text>save-notifications</Text></Pressable></View>;
});
jest.mock("../../components/SettingsCard", () => (props: any) =>
  require("react").createElement(require("react-native").Text, null, "Settings " + props.dateFormat));
jest.mock("../../components/SupportCard", () => () =>
  require("react").createElement(require("react-native").Text, null, "Support"));
jest.mock("../../../sharing/components/SharingCard", () => () =>
  require("react").createElement(require("react-native").Text, null, "Sharing"));
jest.mock("../../../../shared/ui/TopSnackbar", () => () => null);
jest.mock("../../components/modals/ChangeEmailModal", () => () => null);
jest.mock("../../components/modals/ChangePasswordModal", () => () => null);
jest.mock("../../components/modals/DeleteAccountModal", () => () => null);
jest.mock("../../components/modals/ContactUsModal", () => () => null);
jest.mock("../../components/modals/ReportBugModal", () => () => null);

const mockNotifications = fetchProfileNotifications as jest.Mock;
const notifications = {
  email_daily: false, email_hour: 9, email_24h: false,
  push_daily: false, push_hour: 9, push_24h: false,
};
function pending() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function readyLevel(level = 2) {
  mockAccountLevel = { loading: false, progress: { level, xpIntoLevel: 0, xpForNextLevel: 200 } };
}

describe("Profile loading screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifications.mockReset();
    mockSettings = { settings: DEFAULT_SETTINGS, loading: false, applyServerSettings: jest.fn() };
    mockAccountLevel = { progress: null, loading: true };
  });

  it("loads and saves account-wide shared-care consent through Profile notifications", async () => {
    readyLevel();
    mockNotifications.mockResolvedValue({ ...notifications, shared_task_email: true, shared_task_push: false });
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(view.getByTestId("shared-consent").props.children).toBe("true:false"));
    fireEvent.press(view.getByText("toggle-shared-email"));
    fireEvent.press(view.getByText("toggle-shared-push"));
    await act(async () => { fireEvent.press(view.getByText("save-notifications")); });
    expect(updateProfileNotifications).toHaveBeenCalledWith(expect.objectContaining({
      shared_task_email: false, shared_task_push: true, email_daily: false, email_hour: 9,
    }), { auth: true });
  });

  it("loads and saves caregiver due reminders while preserving owned and completion choices", async () => {
    readyLevel();
    mockNotifications.mockResolvedValue({ ...notifications, email_shared_due: true, push_shared_due: false,
      shared_task_email: true, shared_task_push: false });
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(view.getByTestId("shared-due-consent").props.children).toBe("true:false"));
    fireEvent.press(view.getByText("toggle-shared-due-email"));
    fireEvent.press(view.getByText("toggle-shared-due-push"));
    await act(async () => { fireEvent.press(view.getByText("save-notifications")); });
    expect(updateProfileNotifications).toHaveBeenCalledWith(expect.objectContaining({
      email_shared_due: false, push_shared_due: true, email_daily: false, push_daily: false,
      email_hour: 9, push_hour: 9, shared_task_email: true, shared_task_push: false,
    }), { auth: true });
  });

  it("defaults missing caregiver preferences to off for an older response", async () => {
    readyLevel();
    mockNotifications.mockResolvedValue(notifications);
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(view.getByTestId("shared-due-consent").props.children).toBe("false:false"));
  });

  it("keeps every tile hidden until the account XP request has settled", async () => {
    mockNotifications.mockResolvedValue(notifications);
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(mockNotifications).toHaveBeenCalled());
    expect(view.getByText("profile.header.title")).toBeTruthy();
    expect(view.getByTestId("shared-spinner")).toBeTruthy();
    expect(view.queryByText(/Account level/)).toBeNull();
    expect(view.queryByText(/Notifications/)).toBeNull();
    expect(view.queryByText(/Settings/)).toBeNull();
    expect(view.queryByText("Support")).toBeNull();
    expect(view.queryByText("Sharing")).toBeNull();

    readyLevel();
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(view.queryByTestId("shared-spinner")).toBeNull());
    expect(view.getByText("Account level 2")).toBeTruthy();
    expect(view.getByText("Notifications false")).toBeTruthy();
    expect(view.getByText("Settings DD.MM.YYYY")).toBeTruthy();
    expect(view.getByText("Support")).toBeTruthy();
    const tiles = view.getAllByText(/^(Account level 2|Sharing|Notifications false|Settings DD.MM.YYYY|Support)$/);
    expect(tiles.map((tile) => tile.props.children)).toEqual([
      "Account level 2", "Sharing", "Notifications false", "Settings DD.MM.YYYY", "Support",
    ]);
  });

  it("waits for notifications even if account XP is already available", async () => {
    readyLevel();
    const request = pending();
    mockNotifications.mockReturnValue(request.promise);
    const view = render(<ProfileScreen />);
    expect(view.getByTestId("shared-spinner")).toBeTruthy();
    expect(view.queryByText(/Account level/)).toBeNull();
    await act(async () => request.resolve(notifications));
    expect(view.queryByTestId("shared-spinner")).toBeNull();
    expect(view.getByText("Notifications false")).toBeTruthy();
  });

  it("waits for server settings to initialize before revealing their controls", async () => {
    readyLevel();
    mockSettings = { ...mockSettings, loading: true };
    mockNotifications.mockResolvedValue(notifications);
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(mockNotifications).toHaveBeenCalled());
    expect(view.getByTestId("shared-spinner")).toBeTruthy();
    mockSettings = { ...mockSettings, loading: false, settings: { ...DEFAULT_SETTINGS, dateFormat: "YYYY-MM-DD" } };
    view.rerender(<ProfileScreen />);
    await waitFor(() => expect(view.queryByTestId("shared-spinner")).toBeNull());
    expect(view.getByText("Settings YYYY-MM-DD")).toBeTruthy();
  });

  it("shows the shared spinner again during a profile refresh instead of stale tiles", async () => {
    readyLevel();
    mockNotifications.mockResolvedValue(notifications);
    const view = render(<ProfileScreen />);
    await waitFor(() => expect(view.getByText("Account level 2")).toBeTruthy());
    mockAccountLevel = { loading: true, progress: null };
    view.rerender(<ProfileScreen />);
    expect(view.getByTestId("shared-spinner")).toBeTruthy();
    expect(view.queryByText("Account level 2")).toBeNull();
    readyLevel(3);
    view.rerender(<ProfileScreen />);
    expect(view.queryByTestId("shared-spinner")).toBeNull();
    expect(view.getByText("Account level 3")).toBeTruthy();
  });

  it("exits the spinner after failed requests and lets the tiles show their fallback state", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mockAccountLevel = { loading: false, progress: null };
      const request = pending();
      mockNotifications.mockReturnValue(request.promise);
      const view = render(<ProfileScreen />);
      await act(async () => request.reject(new Error("Offline")));
      expect(view.queryByTestId("shared-spinner")).toBeNull();
      expect(view.getByText("Account level unavailable")).toBeTruthy();
      expect(view.getByText("Support")).toBeTruthy();
    } finally {
      warning.mockRestore();
    }
  });
});
