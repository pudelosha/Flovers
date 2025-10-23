// --- API DTOs (server contracts) ---

import type {
  LightLevel,
  Orientation,
  LastWatered,
  LastRepotted,
} from "../../create-plant/types/create-plant.types";

/** CREATE / PATCH payload */
export type ApiPlantInstanceCreatePayload = {
  plant_definition_id: number | null;
  location_id: number;

  display_name: string;
  notes: string;
  purchase_date: string | null; // "YYYY-MM-DD" or null
  photo_uri: string;

  light_level: LightLevel;
  orientation: Orientation;
  distance_cm: number;

  pot_material: string;
  soil_mix: string;

  create_auto_tasks: boolean;
  water_task_enabled: boolean;
  repot_task_enabled: boolean;
  moisture_required: boolean;
  fertilize_required: boolean;
  care_required: boolean;

  last_watered: LastWatered | "" | undefined;
  last_repotted: LastRepotted | "" | undefined;

  moisture_interval_days: number | null;
  fertilize_interval_days: number | null;
  care_interval_days: number | null;
  repot_interval_months: number | null;
};

export type ApiPlantInstanceUpdatePayload = Partial<ApiPlantInstanceCreatePayload>;

/** CREATE response */
export type ApiPlantInstance = {
  id: number;
  plant_definition_id: number | null;
  location_id: number;
  qr_code: string;
  display_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

/** LIST item */
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

/** DETAIL (full) for editing */
export type ApiPlantInstanceDetailFull = {
  id: number;

  plant_definition?: { id: number; name: string; latin?: string | null } | null;
  location?: { id: number; name: string; category: "indoor" | "outdoor" | "other" } | null;

  display_name?: string | null;
  notes?: string | null;
  purchase_date?: string | null;
  photo_uri?: string | null;

  light_level?: LightLevel | null;
  orientation?: Orientation | null;
  distance_cm?: number | null;

  pot_material?: string | null;
  soil_mix?: string | null;

  create_auto_tasks?: boolean | null;
  water_task_enabled?: boolean | null;
  repot_task_enabled?: boolean | null;
  moisture_required?: boolean | null;
  fertilize_required?: boolean | null;
  care_required?: boolean | null;

  last_watered?: LastWatered | "" | null;
  last_repotted?: LastRepotted | "" | null;

  moisture_interval_days?: number | null;
  fertilize_interval_days?: number | null;
  care_interval_days?: number | null;
  repot_interval_months?: number | null;

  qr_code?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Form shape used by EditPlant modal -> PATCH mapper */
export type PlantEditForm = {
  plant_definition_id?: number | string | null;
  location_id?: number | string | null;

  display_name?: string;
  notes?: string;
  purchase_date?: string | null; // "YYYY-MM-DD" or null
  photo_uri?: string;

  light_level?: LightLevel;
  orientation?: Orientation;
  distance_cm?: number;

  pot_material?: string;
  soil_mix?: string;

  create_auto_tasks?: boolean;
  water_task_enabled?: boolean;
  repot_task_enabled?: boolean;
  moisture_required?: boolean;
  fertilize_required?: boolean;
  care_required?: boolean;

  last_watered?: LastWatered | "" | undefined;
  last_repotted?: LastRepotted | "" | undefined;

  moisture_interval_days?: number | null;
  fertilize_interval_days?: number | null;
  care_interval_days?: number | null;
  repot_interval_months?: number | null;
};
