import { request } from "../../client";
import {
  changeMyEmail,
  changeMyPassword,
  fetchProfileNotifications,
  fetchProfileSettings,
  sendSupportBug,
  sendSupportContact,
  updateProfileNotifications,
  updateProfileSettings,
} from "../profile.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("profile.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("fetches and updates notification preferences through API envelopes", async () => {
    mockedRequest.mockResolvedValueOnce({
      status: "success",
      message: "ok",
      data: { email_daily: true, email_hour: 8, email_24h: false, push_daily: true, push_hour: 9, push_24h: true },
    });

    await expect(fetchProfileNotifications({ auth: false })).resolves.toEqual({
      email_daily: true,
      email_hour: 8,
      email_24h: false,
      push_daily: true,
      push_hour: 9,
      push_24h: true,
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/profile/notifications/",
      "GET",
      undefined,
      { auth: false }
    );

    mockedRequest.mockResolvedValueOnce({
      status: "success",
      message: "saved",
      data: { email_daily: false },
    });

    await updateProfileNotifications({ email_daily: false }, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/profile/notifications/",
      "PATCH",
      { email_daily: false },
      { auth: false }
    );
  });

  it("fetches and updates profile settings", async () => {
    mockedRequest.mockResolvedValueOnce({
      status: "success",
      message: "ok",
      data: {
        language: "en",
        date_format: "DD.MM.YYYY",
        temperature_unit: "C",
        measure_unit: "metric",
        tile_transparency: 0.12,
        tile_motive: "light",
        background: "bg1",
        fab_position: "right",
      },
    });

    await expect(fetchProfileSettings({ auth: false })).resolves.toMatchObject({
      language: "en",
      fab_position: "right",
    });

    mockedRequest.mockResolvedValueOnce({
      status: "success",
      message: "saved",
      data: {
        language: "pl",
        date_format: "DD.MM.YYYY",
        temperature_unit: "C",
        measure_unit: "metric",
        tile_transparency: 0.12,
        tile_motive: "light",
        background: "bg1",
        fab_position: "left",
      },
    });

    await updateProfileSettings(
      { language: "pl", fab_position: "left" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/profile/settings/",
      "PATCH",
      { language: "pl", fab_position: "left" },
      { auth: false }
    );
  });

  it("supports account and support actions", async () => {
    mockedRequest.mockResolvedValue({ status: "success", message: "ok", data: null });

    await changeMyPassword(
      { current_password: "old", new_password: "new" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/change-password/",
      "POST",
      { current_password: "old", new_password: "new" },
      { auth: false }
    );

    await changeMyEmail(
      { new_email: "new@example.com", password: "secret" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/change-email/",
      "POST",
      { new_email: "new@example.com", password: "secret" },
      { auth: false }
    );

    await expect(
      sendSupportContact(
        { subject: "Question", message: "Hello", copy_to_user: true },
        { auth: false }
      )
    ).resolves.toEqual({ message: "ok" });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/profile/support/contact/",
      "POST",
      { subject: "Question", message: "Hello", copy_to_user: true },
      { auth: false, timeoutMs: 30000 }
    );

    await sendSupportBug(
      { subject: "Bug", description: "Broken", copy_to_user: false },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/profile/support/bug/",
      "POST",
      { subject: "Bug", description: "Broken", copy_to_user: false },
      { auth: false, timeoutMs: 30000 }
    );
  });
});
