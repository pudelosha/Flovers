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
export type ApiPlantDefinitionMini = {
  id: number;
  name: string;
  latin: string;
  image_thumb?: string | null; // added
  image?: string | null;       // optional fallback
};

export type ApiPlantInstanceListItem = {
  id: number;
  display_name?: string;
  notes?: string;
  location?: { id: number; name: string; category?: string } | null;
  plant_definition?: ApiPlantDefinitionMini | null; // now includes image fields
  qr_code?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** DETAIL (full) for editing */
export type ApiPlantInstanceDetailFull = {
  id: number;

  plant_definition?:
    | {
        id: number;
        name: string;
        latin?: string | null;
        image_thumb?: string | null; // added
        image?: string | null;       // optional fallback
      }
    | null;

  location?:
    | { id: number; name: string; category: "indoor" | "outdoor" | "other" }
    | null;

  // ids (read-only in backend, but useful on client if you ever add them)
  plant_definition_id?: number | null;
  location_id?: number | null;

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

export type Plant = {
  id: string;
  name: string;
  latin?: string;
  location?: string;
  notes: string;
  imageUrl?: string;
  qrCode?: string;
};

