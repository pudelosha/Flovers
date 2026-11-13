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

  it('loads the linked device summary with the screen dataset and tolerates its failure', async () => {
    const devices = await mockedRequest.getMockImplementation()!();
    const summary = { from: '2026-11-12T12:00:00Z', to: '2026-11-13T12:00:00Z', metrics: {
      temperature: { avg: 22, min: 20, max: 24 },
    } };
    mockedRequest.mockImplementation((url: string) => Promise.resolve(url === '/readings/devices/' ? devices : summary));
    expect((await fetchPlantDetailsById(4)).summary24h).toEqual(summary);
    expect(mockedRequest).toHaveBeenCalledWith('/readings/summary-24h/?device_id=8', 'GET', undefined, { auth: true });
    mockedRequest.mockImplementation((url: string) => url === '/readings/devices/'
      ? Promise.resolve(devices) : Promise.reject(new Error('unavailable')));
    const result = await fetchPlantDetailsById(4);
    expect(result.summary24h).toBeNull();
    expect(result.latestReadings?.temperature).toBe(22);
  });
});

it("maps the bounded activity returned with detail without an extra activity request",async()=>{
 jest.clearAllMocks();
 const entries=Array.from({length:12},(_,i)=>({id:i+1,type:i===0?"water":"fertilize",completed_at:"2026-11-01T10:30:00Z",completed_by:i===1?null:{id:"2",name:"Anna"}}));
 mockedFetchPlant.mockResolvedValue({id:4,recent_activity:entries});mockedRequest.mockResolvedValue([]);mockedFetchHomeTasks.mockResolvedValue([]);
 const result=await fetchPlantDetailsById(4);
 expect(result.activity).toHaveLength(10);expect(result.activity[0]).toMatchObject({id:"1",type:"watering",actor:"Anna"});
 expect(result.activity[1]).toMatchObject({type:"fertilising",actor:null});
 expect(mockedRequest).toHaveBeenCalledTimes(1);expect(mockedRequest.mock.calls[0][0]).toBe("/readings/devices/");
});
