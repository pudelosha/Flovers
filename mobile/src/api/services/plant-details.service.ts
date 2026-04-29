import { request } from "../client";

import {
  fetchPlantInstanceDetail,
  fetchPlantByQr,
} from "./plant-instances.service";

import type { ApiPlantInstanceDetailFull } from "../../features/plants/types/plants.types";

import {
  type PlantDetailsComposite,
  type LatestReadings,
  type PlantReminderSummary,
  type PlantSensorsConfig,
  type PlantReminderType,
  type PlantReadingDeviceSummary,
} from "../../features/plant-details/types/plant-details.types";

import type {
  ApiReadingDevice,
  ApiPumpTask,
} from "../../features/readings/types/readings.types";

import {
  fetchHomeTasks,
  type HomeTask,
} from "./home.service";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function toPlantReminderType(t: string | null | undefined): PlantReminderType {
  const x = (t || "").toLowerCase();

  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing") {
    return "fertilising";
  }
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "care") return "care";
  if (x === "repot" || x === "repotting") return "repot";

  return "care";
}

function mapLatestReadings(device: ApiReadingDevice | null): LatestReadings | null {
  if (!device || !device.latest) {
    return null;
  }

  const latest = device.latest;

  return {
    temperature: typeof latest.temperature === "number" ? latest.temperature : null,
    humidity: typeof latest.humidity === "number" ? latest.humidity : null,
    light: typeof latest.light === "number" ? latest.light : null,
    moisture: typeof latest.moisture === "number" ? latest.moisture : null,
    tsISO: device.last_read_at ?? null,
  };
}

function mapSensorsConfig(raw: any): PlantSensorsConfig {
  if (!raw || typeof raw !== "object") {
    return {
      temperature: true,
      humidity: true,
      light: true,
      moisture: true,
    };
  }

  const getFlag = (key: string) => raw[key] !== false;

  return {
    temperature: getFlag("temperature"),
    humidity: getFlag("humidity"),
    light: getFlag("light"),
    moisture: getFlag("moisture"),
  };
}

function mapReadingDeviceSummary(
  device: ApiReadingDevice | null
): PlantReadingDeviceSummary | null {
  if (!device) return null;

  return {
    id: device.id,
    plant: device.plant ?? null,
    plantName: device.plant_name ?? null,
    plantLocation: device.plant_location ?? null,
    deviceName: device.device_name,
    isActive: !!device.is_active,

    pumpIncluded: !!device.pump_included,
    automaticPumpLaunch: !!device.automatic_pump_launch,
    pumpThresholdPct: device.pump_threshold_pct ?? null,
    lastPumpRunAt: device.last_pump_run_at ?? null,
    lastPumpRunSource: device.last_pump_run_source ?? null,
    pendingPumpTask: (device.pending_pump_task ?? null) as ApiPumpTask | null,
  };
}

function mapHomeTaskToReminderSummary(task: HomeTask): PlantReminderSummary | null {
  const baseId = (task as any).reminderId ?? task.id;
  if (!baseId) return null;

  const type = toPlantReminderType((task as any).type);
  const when = (task as any).due || "";
  const dueDate = (task as any).dueDate ?? null;

  return {
    id: String(baseId),
    taskId: String(task.id),
    type,
    when,
    dueDate,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal fetch helpers                                            */
/* ------------------------------------------------------------------ */

async function fetchReadingDevicesSafe(): Promise<ApiReadingDevice[]> {
  try {
    const resp = await request<any>(
      "/api/readings/devices/",
      "GET",
      undefined,
      { auth: true }
    );

    if (Array.isArray(resp)) return resp as ApiReadingDevice[];
    if (resp && Array.isArray(resp.results)) {
      return resp.results as ApiReadingDevice[];
    }

    return [];
  } catch (err) {
    console.warn("[plant-details] fetchReadingDevicesSafe failed:", err);
    return [];
  }
}

async function findDeviceForPlant(
  plantId: number
): Promise<ApiReadingDevice | null> {
  const devices = await fetchReadingDevicesSafe();

  const activeMatch = devices.find(
    (d) => d.is_active && d.plant != null && Number(d.plant) === plantId
  );

  if (activeMatch) return activeMatch;

  const anyMatch = devices.find(
    (d) => d.plant != null && Number(d.plant) === plantId
  );

  return anyMatch || null;
}

async function fetchRemindersForPlant(
  plantId: number
): Promise<PlantReminderSummary[]> {
  try {
    const tasks = await fetchHomeTasks();
    const plantIdStr = String(plantId);

    const relevant = tasks.filter((t) => {
      const tPlantId = (t as any).plantId;
      if (!tPlantId) return false;
      return String(tPlantId) === plantIdStr;
    });

    const summaries: PlantReminderSummary[] = [];

    for (const t of relevant) {
      const mapped = mapHomeTaskToReminderSummary(t);
      if (mapped) summaries.push(mapped);
    }

    return summaries;
  } catch (err) {
    console.warn("[plant-details] fetchRemindersForPlant failed:", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

async function buildCompositeForPlant(
  plant: ApiPlantInstanceDetailFull
): Promise<PlantDetailsComposite> {
  const [device, reminders] = await Promise.all([
    findDeviceForPlant(plant.id),
    fetchRemindersForPlant(plant.id),
  ]);

  const latestReadings = mapLatestReadings(device);
  const sensors = mapSensorsConfig(device?.sensors || null);
  const deviceLinked = !!device;
  const readingDevice = mapReadingDeviceSummary(device);

  return {
    plant,
    latestReadings,
    deviceLinked,
    deviceName: device?.device_name ?? null,
    sensors,
    readingDevice,
    reminders,
  };
}

export async function fetchPlantDetailsById(
  id: number
): Promise<PlantDetailsComposite> {
  const plant = await fetchPlantInstanceDetail(id);
  return await buildCompositeForPlant(plant);
}

export async function fetchPlantDetailsByQr(
  qrCode: string
): Promise<PlantDetailsComposite> {
  const listItem = await fetchPlantByQr(qrCode, { auth: true });
  const plant = await fetchPlantInstanceDetail(Number(listItem.id));

  return await buildCompositeForPlant(plant);
}