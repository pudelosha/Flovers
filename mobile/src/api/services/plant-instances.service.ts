import { request } from "../client";
import type {
  WizardState,
  ApiPlantInstanceCreatePayload,
} from "../../features/create-plant/types/create-plant.types";

/** Build the POST/PUT/PATCH payload from wizard state */
function buildPayload(state: WizardState): ApiPlantInstanceCreatePayload {
  return {
    // FKs
    location_id: Number(state.selectedLocationId),
    plant_definition_id: state.selectedPlant?.id ? Number(state.selectedPlant.id) : null,

    // display
    display_name: state.displayName?.trim() || "",
    notes: state.notes?.trim() || "",
    purchase_date: state.purchaseDateISO ?? null,
    photo_uri: state.photoUri || "",

    // exposure
    light_level: state.lightLevel,
    orientation: state.orientation,
    distance_cm: Math.max(0, Math.round(state.distanceCm || 0)),

    // container / soil
    pot_material: (state.potMaterial as any) ?? "",
    soil_mix: (state.soilMix as any) ?? "",

    // auto tasks prefs
    create_auto_tasks: !!state.createAutoTasks,
    water_task_enabled: !!state.waterTaskEnabled,
    repot_task_enabled: !!state.repotTaskEnabled,
    moisture_required: !!state.moistureRequired,
    fertilize_required: !!state.fertilizeRequired,
    care_required: !!state.careRequired,

    last_watered: (state as any).lastWatered ?? "",
    last_repotted: (state as any).lastRepotted ?? "",

    moisture_interval_days: state.moistureIntervalDays ?? null,
    fertilize_interval_days: state.fertilizeIntervalDays ?? null,
    care_interval_days: state.careIntervalDays ?? null,
    repot_interval_months: state.repotIntervalMonths ?? null,
  };
}

/** ---- Create ---- */
export type ApiPlantInstance = {
  id: number;
  plant_definition_id: number | null;
  location_id: number;
  // include qr_code so UI can render/print it too
  qr_code: string;
  // not strictly needed for details nav, but handy:
  display_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export async function createPlantInstance(
  state: WizardState,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstance> {
  const payload = buildPayload(state);
  return await request<ApiPlantInstance>(
    "/api/plant-instances/",
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- List/Detail types ---- */
export type ApiPlantInstanceListItem = {
  id: number;
  display_name: string;
  notes: string;
  location?: { id: number; name: string; category: "indoor" | "outdoor" | "other" } | null;
  plant_definition?: { id: number; name: string; latin: string } | null;
  qr_code: string;
  created_at: string;
  updated_at: string;
};

export async function fetchPlantInstances(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceListItem[]> {
  return await request<ApiPlantInstanceListItem[]>(
    "/api/plant-instances/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/** ---- Delete ---- */
export async function deletePlantInstance(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(
    `/api/plant-instances/${id}/`,
    "DELETE",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/** ---- Update (for later) ---- */
export type ApiPlantInstanceUpdatePayload = Partial<ApiPlantInstanceCreatePayload>;

export async function updatePlantInstance(
  id: number,
  payload: ApiPlantInstanceUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceListItem> {
  // Using PATCH for partial updates
  return await request<ApiPlantInstanceListItem>(
    `/api/plant-instances/${id}/`,
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Fetch by QR code ---- */
export async function fetchPlantByQr(
  code: string,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceListItem> {
  return await request<ApiPlantInstanceListItem>(
    `/api/plant-instances/by-qr/?code=${encodeURIComponent(code)}`,
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

// Keep this one for non-QR entry points
export async function fetchPlantInstanceDetail(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceListItem> {
  return await request<ApiPlantInstanceListItem>(
    `/api/plant-instances/${id}/`,
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}
