import { request, requestWithAccessToken } from "../../client";
import { startPushNotifications, stopPushNotifications, unregisterPushNotifications } from "../push.service";
import messaging from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import { Linking } from "react-native";

jest.mock("@react-native-firebase/messaging", () => {
  const api = {
    requestPermission: jest.fn(async () => 1), getToken: jest.fn(async () => "test-push-token"),
    deleteToken: jest.fn(async () => undefined), getInitialNotification: jest.fn(async () => null),
    onNotificationOpenedApp: jest.fn(() => jest.fn()), onMessage: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
  };
  return { __esModule: true, default: () => api, AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 } };
});

jest.mock("../../client", () => ({
  request: jest.fn(),
  requestWithAccessToken: jest.fn(),
}));

const mockedRequest = request as jest.Mock;
const mockedTeardownRequest = requestWithAccessToken as jest.Mock;
const native = messaging() as any;
const backgroundOpen = (notifee.onBackgroundEvent as jest.Mock).mock.calls[0][0];

describe("push.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    native.requestPermission.mockResolvedValue(1);
    native.getToken.mockResolvedValue("test-push-token");
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ status: "success", message: "ok", data: null });
    mockedTeardownRequest.mockReset().mockResolvedValue(undefined);
    native.deleteToken.mockReset().mockResolvedValue(undefined);
    stopPushNotifications();
  });

  it("retries after registration failure and shares concurrent initialization", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("Offline"));
    await expect(startPushNotifications()).rejects.toThrow("Offline");
    expect(native.onMessage).not.toHaveBeenCalled();
    await Promise.all([startPushNotifications(), startPushNotifications()]);
    expect(mockedRequest).toHaveBeenCalledTimes(2);
    expect(native.onMessage).toHaveBeenCalledTimes(1);
  });

  it("does not install listeners if stopped during registration", async () => {
    let resolve!: (value: any) => void;
    mockedRequest.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const pending = startPushNotifications();
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    stopPushNotifications();
    resolve({ status: "success" });
    await pending;
    expect(native.onMessage).not.toHaveBeenCalled();
    await startPushNotifications();
    expect(native.onMessage).toHaveBeenCalledTimes(1);
  });

  it("does not register when push permission is denied", async () => {
    native.requestPermission.mockResolvedValueOnce(0);
    await startPushNotifications();
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(native.onMessage).not.toHaveBeenCalled();
    await startPushNotifications();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("includes a press action and preserves routing on foreground notifications", async () => {
    await startPushNotifications();
    const receive = native.onMessage.mock.calls[0][0];
    await receive({ notification: { title: "Reminder", body: "Water today" }, data: { route: "Home" } });
    expect(notifee.displayNotification).toHaveBeenCalledWith(expect.objectContaining({
      data: { route: "Home" }, android: { channelId: "default", pressAction: { id: "default" } },
    }));
  });

  it("deactivates the device before revoking its native token, including offline logout", async () => {
    await startPushNotifications();
    mockedTeardownRequest.mockRejectedValueOnce(new Error("Offline"));
    await unregisterPushNotifications("access-a");
    expect(mockedTeardownRequest).toHaveBeenLastCalledWith("/profile/push-devices/", "DELETE", { token: "test-push-token" }, "access-a", expect.any(Number));
    expect(native.deleteToken).toHaveBeenCalledTimes(1);
    expect(mockedTeardownRequest.mock.invocationCallOrder.at(-1)).toBeLessThan(native.deleteToken.mock.invocationCallOrder[0]);
  });

  it("waits for the old token to be revoked before starting the next session's registration", async () => {
    await startPushNotifications();
    let release!: () => void;
    native.deleteToken.mockReturnValueOnce(new Promise<void>(done => { release = done; }));
    const stopping = unregisterPushNotifications("access-a");
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(native.deleteToken).toHaveBeenCalledTimes(1);
    const restarting = startPushNotifications();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(native.getToken).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([stopping, restarting]);
    expect(native.getToken).toHaveBeenCalledTimes(2);
    expect(mockedRequest.mock.calls.map(call => call[1])).toEqual(["POST", "POST"]);
    expect(mockedTeardownRequest).toHaveBeenCalledTimes(1);
  });

  it("bounds native teardown so an unresponsive push module cannot block the next session", async () => {
    jest.useFakeTimers();
    try {
      await startPushNotifications();
      native.deleteToken.mockImplementationOnce(() => new Promise(() => {}));
      mockedTeardownRequest.mockImplementationOnce(() => new Promise(() => {}));
      const stopping = unregisterPushNotifications("access-a");
      for (let i = 0; i < 12; i++) await Promise.resolve();
      const restarting = startPushNotifications();
      jest.advanceTimersByTime(5000);
      await Promise.all([stopping, restarting]);
      expect(mockedTeardownRequest.mock.calls[0][3]).toBe("access-a");
      expect(native.getToken).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
  });

  it("opens a background notification using the server's supported route data", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      await backgroundOpen({ type: 1, detail: { notification: { data: { route: "Readings" } } } });
      expect(open).toHaveBeenCalledWith("flovers://readings");
    } finally { open.mockRestore(); }
  });

  afterEach(() => {
    stopPushNotifications();
  });

  it("registers the current push token once when starting notifications", async () => {
    await startPushNotifications();

    expect(mockedRequest).toHaveBeenCalledWith(
      "/profile/push-devices/",
      "POST",
      { token: "test-push-token", platform: expect.any(String) },
      { auth: true }
    );

    await startPushNotifications();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
