import { request } from "../../client";
import {
  changeMyEmail,
  changeMyPassword,
  deleteMyAccount,
  fetchProfileNotifications,
  fetchProfileProgression,
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

  it("confirms account deletion with the current password before returning owned photo IDs", async () => {
    mockedRequest.mockResolvedValue({ status: "success", data: { deleted_plant_ids: [12, 15] } });
    await expect(deleteMyAccount("current-password")).resolves.toEqual([12, 15]);
    expect(mockedRequest).toHaveBeenCalledWith("/auth/account/", "DELETE", { current_password: "current-password" }, { auth: true, timeoutMs: 30000 });
  });

  it("does not accept malformed deletion acknowledgements as successful", async () => {
    mockedRequest.mockResolvedValue({ status: "error", data: { deleted_plant_ids: [12] } });
    await expect(deleteMyAccount("current-password")).rejects.toThrow("Invalid account deletion response");
    mockedRequest.mockResolvedValue({ status: "success", data: { deleted_plant_ids: ["another-account"] } });
    await expect(deleteMyAccount("current-password")).rejects.toThrow("Invalid account deletion response");
  });

  it("reads account progression without submitting client XP", async () => {
    const progression = { total_xp: 100, level: 2, rank_key: "seedling", xp_into_level: 0,
      xp_for_next_level: 200, daily_xp: 100, daily_cap: 250 };
    mockedRequest.mockResolvedValue({ status: "success", message: "ok", data: progression });
    await expect(fetchProfileProgression()).resolves.toEqual(progression);
    expect(mockedRequest).toHaveBeenCalledWith("/profile/progression/", "GET", undefined, { auth: true });
  });

  it("rejects malformed progression rather than showing a fictional level", async () => {
    mockedRequest.mockResolvedValue({ status: "success", data: { level: 0, xp_into_level: 0, xp_for_next_level: 100 } });
    await expect(fetchProfileProgression()).rejects.toThrow("Invalid account progression");
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
      "/profile/notifications/",
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
      "/profile/notifications/",
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
      "/profile/settings/",
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
      "/auth/change-password/",
      "POST",
      { current_password: "old", new_password: "new" },
      { auth: false }
    );

    await changeMyEmail(
      { new_email: "new@example.com", password: "secret" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/change-email/",
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
      "/profile/support/contact/",
      "POST",
      { subject: "Question", message: "Hello", copy_to_user: true },
      { auth: false, timeoutMs: 30000 }
    );

    await sendSupportBug(
      { subject: "Bug", description: "Broken", copy_to_user: false },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/profile/support/bug/",
      "POST",
      { subject: "Bug", description: "Broken", copy_to_user: false },
      { auth: false, timeoutMs: 30000 }
    );
  });
});
