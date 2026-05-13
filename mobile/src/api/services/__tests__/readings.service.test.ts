import { request } from "../../client";
import {
  createReadingDevice,
  deleteReadingDevice,
  fetchDeviceSetup,
  fetchPumpStatus,
  fetchReadingsFeed,
  fetchReadingsHistory,
  getReadingDevice,
  listReadingDevices,
  recallPumpWatering,
  rotateAccountSecret,
  schedulePumpWatering,
  sendDeviceCodeByEmail,
  sendReadingsExportEmail,
  toReadingTile,
  toggleAutoPump,
  updateReadingDevice,
} from "../readings.service";
import type { ApiReadingDevice } from "../../../features/readings/types/readings.types";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("readings.service", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({});
  });

  it("maps pump-aware reading devices into tile models", () => {
    const device: ApiReadingDevice = {
      id: 3,
      plant: 7,
      plant_name: "Calathea",
      plant_location: "Bedroom",
      device_name: "ESP32 #1",
      is_active: true,
      device_key: "ABCD1234",
      interval_hours: 2,
      sensors: {
        temperature: true,
        humidity: true,
        light: false,
        moisture: true,
      },
      latest: {
        temperature: 22.5,
        humidity: 61,
        light: null,
        moisture: 34,
      },
      last_read_at: "2026-05-13T12:00:00Z",
      pump_included: true,
      automatic_pump_launch: true,
      pump_threshold_pct: 30,
      last_pump_run_at: "2026-05-13T11:00:00Z",
      pending_pump_task: {
        id: 9,
        source: "manual",
        status: "pending",
        requested_at: "2026-05-13T12:10:00Z",
      },
      send_email_watering_notifications: true,
      send_push_watering_notifications: false,
      created_at: "2026-05-13T10:00:00Z",
      updated_at: "2026-05-13T12:00:00Z",
    };

    expect(toReadingTile(device)).toEqual(
      expect.objectContaining({
        id: "3",
        name: "Calathea",
        location: "Bedroom",
        status: "enabled",
        pumpIncluded: true,
        automaticPumpLaunch: true,
        pumpThresholdPct: 30,
        sendEmailWateringNotifications: true,
        pendingPumpTask: device.pending_pump_task,
      })
    );
  });

  it("sends pump configuration when creating a reading device", async () => {
    const payload = {
      plant: 7,
      device_name: "Bedroom node",
      interval_hours: 1,
      sensors: {
        temperature: true,
        humidity: true,
        light: true,
        moisture: true,
      },
      moisture_alert_enabled: true,
      moisture_alert_threshold: 35,
      send_email_notifications: true,
      send_push_notifications: true,
      pump_included: true,
      automatic_pump_launch: true,
      pump_threshold_pct: 30,
      send_email_watering_notifications: true,
      send_push_watering_notifications: false,
    };

    await createReadingDevice(payload, { auth: false });

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/readings/devices/",
      "POST",
      payload,
      { auth: false }
    );
  });

  it("uses dedicated pump endpoints for manual scheduling and auto-pump updates", async () => {
    await schedulePumpWatering(7, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/7/pump-schedule/",
      "POST",
      undefined,
      { auth: false }
    );

    await recallPumpWatering(7, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/7/pump-recall/",
      "POST",
      undefined,
      { auth: false }
    );

    await toggleAutoPump(
      7,
      { automatic_pump_launch: true, pump_threshold_pct: 28 },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/7/auto-pump/",
      "PATCH",
      { automatic_pump_launch: true, pump_threshold_pct: 28 },
      { auth: false }
    );
  });

  it("supports reading device CRUD and setup actions", async () => {
    await listReadingDevices({ auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/",
      "GET",
      undefined,
      { auth: false }
    );

    await getReadingDevice(5, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/5/",
      "GET",
      undefined,
      { auth: false }
    );

    await updateReadingDevice(5, { device_name: "Updated" }, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/5/",
      "PATCH",
      { device_name: "Updated" },
      { auth: false }
    );

    await deleteReadingDevice(5, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/5/",
      "DELETE",
      undefined,
      { auth: false }
    );

    await rotateAccountSecret({ auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/rotate-secret/",
      "POST",
      undefined,
      { auth: false }
    );

    await fetchDeviceSetup({ auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/device-setup/",
      "GET",
      undefined,
      { auth: false }
    );

    await sendDeviceCodeByEmail(5, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/5/send-code-email/",
      "POST",
      undefined,
      { auth: false }
    );
  });

  it("supports readings exports, feed and history queries", async () => {
    await sendReadingsExportEmail(
      { plantId: "4", status: "enabled", lang: "en" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/export-email/",
      "POST",
      { plantId: "4", status: "enabled", lang: "en" },
      { auth: false }
    );

    await fetchReadingsFeed(
      {
        deviceKey: "DEVICE1",
        secret: "SECRET",
        deviceId: 9,
        from: "2026-05-01T00:00:00Z",
        to: "2026-05-13T00:00:00Z",
        limit: 50,
      },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/feed/?secret=SECRET&device_key=DEVICE1&device_id=9&from=2026-05-01T00%3A00%3A00Z&to=2026-05-13T00%3A00%3A00Z&limit=50",
      "GET",
      undefined,
      { auth: false }
    );

    await fetchReadingsHistory(
      {
        deviceId: 9,
        range: "week",
        metric: "moisture",
        stat: "avg",
        anchor: "2026-05-13T00:00:00Z",
      },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/history/?device_id=9&range=week&metric=moisture&stat=avg&anchor=2026-05-13T00%3A00%3A00Z",
      "GET",
      undefined,
      { auth: false }
    );

    await fetchPumpStatus(9, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/readings/devices/9/pump-status/",
      "GET",
      undefined,
      { auth: false }
    );
  });
});
