import { request } from "../../client";
import {
  fetchPlantByQr,
  fetchPlantInstanceDetail,
} from "../plant-instances.service";
import { fetchHomeTasks } from "../home.service";
import {
  fetchPlantDetailsById,
  fetchPlantDetailsByQr,
} from "../plant-details.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

jest.mock("../plant-instances.service", () => ({
  fetchPlantByQr: jest.fn(),
  fetchPlantInstanceDetail: jest.fn(),
}));

jest.mock("../home.service", () => ({
  fetchHomeTasks: jest.fn(),
}));

const mockedRequest = request as jest.Mock;
const mockedFetchPlant = fetchPlantInstanceDetail as jest.Mock;
const mockedFetchByQr = fetchPlantByQr as jest.Mock;
const mockedFetchHomeTasks = fetchHomeTasks as jest.Mock;

describe("plant-details.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchPlant.mockResolvedValue({
      id: 4,
      display_name: "Fern",
    });
    mockedFetchByQr.mockResolvedValue({ id: 4 });
    mockedRequest.mockResolvedValue([
      {
        id: 8,
        plant: 4,
        plant_name: "Fern",
        plant_location: "Kitchen",
        device_name: "ESP32",
        is_active: true,
        sensors: {
          temperature: true,
          humidity: true,
          light: false,
          moisture: true,
        },
        latest: {
          temperature: 22,
          humidity: 60,
          light: null,
          moisture: 31,
        },
        last_read_at: "2026-05-13T12:00:00Z",
        pump_included: true,
        automatic_pump_launch: true,
        pump_threshold_pct: 30,
        pending_pump_task: {
          id: 1,
          source: "manual",
          status: "pending",
          requested_at: "2026-05-13T12:05:00Z",
        },
      },
    ]);
    mockedFetchHomeTasks.mockResolvedValue([
      {
        id: "11",
        reminderId: "3",
        plantId: "4",
        type: "watering",
        due: "Today",
        dueDate: new Date("2026-05-13"),
      },
    ]);
  });

  it("builds plant details composites with readings, pump and reminders", async () => {
    await expect(fetchPlantDetailsById(4)).resolves.toMatchObject({
      plant: { id: 4, display_name: "Fern" },
      latestReadings: {
        temperature: 22,
        humidity: 60,
        light: null,
        moisture: 31,
        tsISO: "2026-05-13T12:00:00Z",
      },
      deviceLinked: true,
      deviceName: "ESP32",
      sensors: {
        temperature: true,
        humidity: true,
        light: false,
        moisture: true,
      },
      readingDevice: {
        id: 8,
        pumpIncluded: true,
        automaticPumpLaunch: true,
        pumpThresholdPct: 30,
      },
      reminders: [
        {
          id: "3",
          taskId: "11",
          type: "watering",
          when: "Today",
        },
      ],
    });
  });

  it("resolves QR codes through plant detail fetch", async () => {
    await fetchPlantDetailsByQr("QR123");
    expect(mockedFetchByQr).toHaveBeenCalledWith("QR123", { auth: true });
    expect(mockedFetchPlant).toHaveBeenCalledWith(4);
  });
});
