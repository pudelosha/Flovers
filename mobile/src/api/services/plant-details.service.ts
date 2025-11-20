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
} from "../../features/plant-details/types/plant-details.types";

import {
  fetchHomeTasks,
  type HomeTask,
} from "./home.service";

/**
 * Backend shape of ReadingDevice list item
 * (derived from ReadingDeviceSerializer in readings.serializers).
 */
type ApiReadingDevice = {
  id: number;
  plant: number | null;
  plant_name: string | null;
  plant_location: string | null;
  device_name: string;
  is_active: boolean;
  device_key: string;
  notes: string | null;
  interval_hours: number;
  sensors: Record<string, any> | null;
  last_read_at: string | null;
  latest: {
    temperature: number | null;
    humidity: number | null;
    light: number | null;
    moisture: number | null;
  } | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Normalize reminder / task type into a UI-friendly type
 * shared with Reminders & Home (watering, fertilising, moisture, care, repot).
 */
function toPlantReminderType(t: string | null | undefined): PlantReminderType {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing")
    return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "care") return "care";
  if (x === "repot" || x === "repotting") return "repot";
  return "care";
}

/**
 * Map ReadingDevice.latest + last_read_at into LatestReadings.
 */
function mapLatestReadings(device: ApiReadingDevice | null): LatestReadings | null {
  if (!device || !device.latest) {
    return null;
  }

  const latest = device.latest;
  return {
    temperature:
      typeof latest.temperature === "number" ? latest.temperature : null,
    humidity: typeof latest.humidity === "number" ? latest.humidity : null,
    light: typeof latest.light === "number" ? latest.light : null,
    moisture: typeof latest.moisture === "number" ? latest.moisture : null,
    tsISO: device.last_read_at ?? null,
  };
}

/**
 * Derive PlantSensorsConfig from ReadingDevice.sensors JSON.
 *
 * Convention:
 * - if a metric key is explicitly false → disabled
 * - otherwise it's treated as enabled (default true)
 */
function mapSensorsConfig(raw: any): PlantSensorsConfig {
  if (!raw || typeof raw !== "object") {
    return {
      temperature: true,
      humidity: true,
      light: true,
      moisture: true,
    };
  }

  const getFlag = (key: string) => (raw[key] === false ? false : true);

  return {
    temperature: getFlag("temperature"),
    humidity: getFlag("humidity"),
    light: getFlag("light"),
    moisture: getFlag("moisture"),
  };
}

/**
 * Map a HomeTask (from Home screen API) into a PlantReminderSummary.
 * Returns null if we don't have enough identity info.
 */
function mapHomeTaskToReminderSummary(task: HomeTask): PlantReminderSummary | null {
  // HomeTask usually includes reminderId for the underlying Reminder
  const baseId = (task as any).reminderId ?? task.id;
  if (!baseId) return null;

  const type = toPlantReminderType((task as any).type);
  const when = (task as any).due || "";

  return {
    id: String(baseId),
    taskId: String(task.id),
    type,
    when,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal fetch helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch all reading devices for current user.
 * Backend: ReadingDeviceViewSet list -> /api/readings/devices/
 *
 * Hardened so that if the backend returns non-JSON (HTML error page, 204, etc)
 * we swallow the error and return an empty array instead of crashing the screen.
 */
async function fetchReadingDevicesSafe(): Promise<ApiReadingDevice[]> {
  try {
    const resp = await request<any>(
      "/api/readings/devices/",
      "GET",
      undefined,
      { auth: true }
    );

    // Support both plain array and DRF paginated response
    if (Array.isArray(resp)) return resp as ApiReadingDevice[];
    if (resp && Array.isArray(resp.results)) return resp.results as ApiReadingDevice[];

    return [];
  } catch (err) {
    console.warn("[plant-details] fetchReadingDevicesSafe failed:", err);
    // Fail-soft: no devices => no readings tile, but the screen still works
    return [];
  }
}

/**
 * Get the ReadingDevice (if any) that is linked to the given plant id.
 * We simply pick the first active device where device.plant === plantId.
 */
async function findDeviceForPlant(
  plantId: number
): Promise<ApiReadingDevice | null> {
  const devices = await fetchReadingDevicesSafe();
  const match = devices.find(
    (d) => d.is_active && d.plant != null && Number(d.plant) === plantId
  );
  return match || null;
}

/**
 * Fetch all Home tasks and reduce them to reminders for a single plant.
 * Uses the existing /api/home/ tasks service (same as HomeScreen).
 */
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
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Compose the full PlantDetailsComposite from:
 * - PlantInstance detail
 * - ReadingDevice (if linked)
 * - Home tasks/reminders for this plant
 */
async function buildCompositeForPlant(
  plant: ApiPlantInstanceDetailFull
): Promise<PlantDetailsComposite> {
  const [device, reminders] = await Promise.all([
    findDeviceForPlant(plant.id),
    fetchRemindersForPlant(plant.id),
  ]);

  const latestReadings = mapLatestReadings(device);
  const sensors = mapSensorsConfig(device?.sensors || null);

  // Consider device "linked" whenever a device exists,
  // even if there is no latest reading yet.
  const deviceLinked = !!device;

  return {
    plant,
    latestReadings,
    deviceLinked,
    deviceName: device?.device_name ?? null,
    sensors,
    reminders,
  };
}

/**
 * Fetch details by numeric plant ID and compose them into a single object
 * for the screen to consume.
 */
export async function fetchPlantDetailsById(
  id: number
): Promise<PlantDetailsComposite> {
  // Full editable detail (PlantInstanceDetailSerializer)
  const plant = await fetchPlantInstanceDetail(id);
  return await buildCompositeForPlant(plant);
}

/**
 * Fetch details by QR code and compose them into a single object.
 *
 * Flow:
 *   QR -> PlantInstanceListSerializer (via /by-qr/) -> full detail -> composite
 */
export async function fetchPlantDetailsByQr(
  qrCode: string
): Promise<PlantDetailsComposite> {
  // First get the list/read shape to obtain the plant id
  const listItem = await fetchPlantByQr(qrCode, { auth: true });

  // Then load FULL detail by id
  const plant = await fetchPlantInstanceDetail(Number(listItem.id));

  return await buildCompositeForPlant(plant);
}
