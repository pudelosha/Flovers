import { request } from "../client";
import type {
  WizardState,
  ApiPlantInstanceCreatePayload,
  ApiPlantInstance,
} from "../../features/create-plant/types/create-plant.types";

/** Build the POST payload from wizard state */
function buildPayload(state: WizardState): ApiPlantInstanceCreatePayload {
  return {
    // FKs
    location_id: Number(state.selectedLocationId),                   // required
    plant_definition_id: state.selectedPlant?.id
      ? Number(state.selectedPlant.id)
      : null,

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
    pot_material: state.potMaterial ?? "",   // store the key as-is (or empty)
    soil_mix: state.soilMix ?? "",           // store the key as-is (or empty)

    // auto tasks preferences (just send settings; backend will generate later)
    create_auto_tasks: !!state.createAutoTasks,
    water_task_enabled: !!state.waterTaskEnabled,
    repot_task_enabled: !!state.repotTaskEnabled,
    moisture_required: !!state.moistureRequired,
    fertilize_required: !!state.fertilizeRequired,
    care_required: !!state.careRequired,

    last_watered: state.lastWatered ?? "",
    last_repotted: state.lastRepotted ?? "",

    moisture_interval_days: state.moistureIntervalDays ?? null,
    fertilize_interval_days: state.fertilizeIntervalDays ?? null,
    care_interval_days: state.careIntervalDays ?? null,
    repot_interval_months: state.repotIntervalMonths ?? null,
  };
}

/** Create a plant instance on the server and return the created row */
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

/** List types + fetch */
export type ApiPlantInstanceListItem = {
  id: number;
  display_name: string;
  notes: string;
  location?: { id: number; name: string; category: "indoor" | "outdoor" | "other" } | null;
  plant_definition?: { id: number; name: string; latin: string } | null;
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
