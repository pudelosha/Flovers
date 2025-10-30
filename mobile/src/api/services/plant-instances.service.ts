// C:\Projekty\Python\Flovers\mobile\src\api\services\plant-instances.service.ts
import { request } from "../client";

import type {
  ApiPlantInstanceCreatePayload,
  ApiPlantInstance,
  ApiPlantInstanceListItem,
  ApiPlantInstanceDetailFull,
  ApiPlantInstanceUpdatePayload,
} from "../../features/plants/types/plants.types";

import type { WizardState } from "../../features/create-plant/types/create-plant.types";
import type { PlantEditForm } from "../../features/plants/types/plants.types";

/** Build the POST payload from wizard state (unchanged) */
function buildPayload(state: WizardState): ApiPlantInstanceCreatePayload {
  return {
    location_id: Number(state.selectedLocationId),
    plant_definition_id: state.selectedPlant?.id ? Number(state.selectedPlant.id) : null,

    display_name: state.displayName?.trim() || "",
    notes: state.notes?.trim() || "",
    purchase_date: state.purchaseDateISO ?? null,
    photo_uri: state.photoUri || "",

    light_level: state.lightLevel,
    orientation: state.orientation,
    distance_cm: Math.max(0, Math.round(state.distanceCm || 0)),

    pot_material: (state.potMaterial as any) ?? "",
    soil_mix: (state.soilMix as any) ?? "",

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
export async function createPlantInstance(
  state: WizardState,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstance> {
  const payload = buildPayload(state);
  return await request<ApiPlantInstance>("/api/plant-instances/", "POST", payload, { auth: opts.auth ?? true });
}

/** ---- List ---- */
export async function fetchPlantInstances(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceListItem[]> {
  const resp = await request<any>("/api/plant-instances/", "GET", undefined, { auth: opts.auth ?? true });
  // DRF pagination support + safety
  if (Array.isArray(resp)) return resp as ApiPlantInstanceListItem[];
  if (resp && Array.isArray(resp.results)) return resp.results as ApiPlantInstanceListItem[];
  return [];
}

/** ---- Detail for edit ---- */
export async function fetchPlantInstanceForEdit(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiPlantInstanceDetailFull> {
  return await request<ApiPlantInstanceDetailFull>(`/api/plant-instances/${id}/`, "GET", undefined, { auth: opts.auth ?? true });
}

/** ---- Delete ---- */
export async function deletePlantInstance(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(`/api/plant-instances/${id}/`, "DELETE", undefined, { auth: opts.auth ?? true });
}

/** ---- Update (PATCH) with raw API payload ---- */
export async function updatePlantInstance(
  id: number,
  payload: ApiPlantInstanceUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
) {
  return await request<ApiPlantInstanceListItem>(`/api/plant-instances/${id}/`, "PATCH", payload, { auth: opts.auth ?? true });
}

/** UI form -> API PATCH payload (uses PlantEditForm from plants.types) */
export function buildUpdatePayloadFromForm(form: PlantEditForm): ApiPlantInstanceUpdatePayload {
  const coerceNum = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));
  const out: ApiPlantInstanceUpdatePayload = {};

  if ("plant_definition_id" in form) out.plant_definition_id = coerceNum(form.plant_definition_id);
  if ("location_id" in form && form.location_id !== undefined && form.location_id !== null) {
    out.location_id = Number(form.location_id);
  }

  if ("display_name" in form) out.display_name = form.display_name ?? "";
  if ("notes" in form) out.notes = form.notes ?? "";
  if ("purchase_date" in form) out.purchase_date = form.purchase_date ?? null;
  if ("photo_uri" in form) out.photo_uri = form.photo_uri ?? "";

  if ("light_level" in form) out.light_level = form.light_level!;
  if ("orientation" in form) out.orientation = form.orientation!;
  if ("distance_cm" in form && typeof form.distance_cm === "number") out.distance_cm = Math.max(0, Math.round(form.distance_cm));

  if ("pot_material" in form) out.pot_material = String(form.pot_material ?? "");
  if ("soil_mix" in form) out.soil_mix = String(form.soil_mix ?? "");

  if ("create_auto_tasks" in form) out.create_auto_tasks = !!form.create_auto_tasks;
  if ("water_task_enabled" in form) out.water_task_enabled = !!form.water_task_enabled;
  if ("repot_task_enabled" in form) out.repot_task_enabled = !!form.repot_task_enabled;
  if ("moisture_required" in form) out.moisture_required = !!form.moisture_required;
  if ("fertilize_required" in form) out.fertilize_required = !!form.fertilize_required;
  if ("care_required" in form) out.care_required = !!form.care_required;

  if ("last_watered" in form) out.last_watered = (form.last_watered as any) ?? "";
  if ("last_repotted" in form) out.last_repotted = (form.last_repotted as any) ?? "";

  if ("moisture_interval_days" in form) out.moisture_interval_days = form.moisture_interval_days ?? null;
  if ("fertilize_interval_days" in form) out.fertilize_interval_days = form.fertilize_interval_days ?? null;
  if ("care_interval_days" in form) out.care_interval_days = form.care_interval_days ?? null;
  if ("repot_interval_months" in form) out.repot_interval_months = form.repot_interval_months ?? null;

  return out;
}

/** Convenience: PATCH using PlantEditForm directly */
export async function updatePlantInstanceFromForm(
  id: number,
  form: PlantEditForm,
  opts: { auth?: boolean } = { auth: true }
) {
  const payload = buildUpdatePayloadFromForm(form);
  return await updatePlantInstance(id, payload, opts);
}

/** ---- Fetch by QR ---- */
export async function fetchPlantByQr(code: string, opts: { auth?: boolean } = { auth: true }) {
  return await request<ApiPlantInstanceListItem>(`/api/plant-instances/by-qr/?code=${encodeURIComponent(code)}`, "GET", undefined, { auth: opts.auth ?? true });
}

export async function fetchPlantInstanceDetail(id: number, opts: { auth?: boolean } = { auth: true }) {
  return await request<ApiPlantInstanceDetailFull>(`/api/plant-instances/${id}/`, "GET", undefined, { auth: opts.auth ?? true });
}
