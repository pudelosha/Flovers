import { request } from "../../client";
import { startPushNotifications, stopPushNotifications } from "../push.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("push.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({ status: "success", message: "ok", data: null });
    stopPushNotifications();
  });

  afterEach(() => {
    stopPushNotifications();
  });

  it("registers the current push token once when starting notifications", async () => {
    await startPushNotifications();

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/profile/push-devices/",
      "POST",
      { token: "test-push-token", platform: expect.any(String) },
      { auth: true }
    );

    await startPushNotifications();
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
