import type {
  PlantDefinition,
  SunRequirement,
  WaterRequirement,
  DifficultyLevel,
  Suggestion,
  PlantProfile,
  PlantTrait,
} from "../../features/create-plant/types/create-plant.types";

/** API TYPES */

export type ApiPlantDefinition = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string;
  latin: string;
  image?: string | null;
  sun: SunRequirement;
  water: WaterRequirement;
  difficulty: DifficultyLevel;
};

export type ApiPlantSuggestion = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string;
  latin: string;
};

export type ApiPlantProfile = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string;
  latin: string;

  image?: string | null;
  image_thumb?: string | null;
  description?: string;
  traits?: any;

  // ✅ AUTO TASK FLAGS
  water_required?: boolean;
  water_interval_days?: number | null;

  moisture_required?: boolean;
  moisture_interval_days?: number | null;

  fertilize_required?: boolean;
  fertilize_interval_days?: number | null;

  repot_required?: boolean;
  repot_interval_months?: number | null;
};

/* helpers */

function toIdString(id: string | number | undefined | null) {
  if (typeof id === "string") return id;
  if (typeof id === "number") return String(id);
  return "";
}

function pickDisplayName(p: { display_name?: any; name?: any; latin?: any }) {
  const v = p?.display_name ?? p?.name ?? "";
  if (typeof v === "string" && v.trim()) return v.trim();
  return typeof p?.latin === "string" ? p.latin : "";
}

/* serializers */

export function serializePlantProfile(p: ApiPlantProfile): PlantProfile {
  const traits: PlantTrait[] = Array.isArray(p?.traits) ? p.traits : [];

  return {
    id: toIdString(p.id),
    name: pickDisplayName(p),
    latin: p.latin,
    image: p.image ?? null,
    description: p.description ?? "",
    traits,

    // ✅ PASS FLAGS THROUGH
    water_required: p.water_required,
    water_interval_days: p.water_interval_days,

    moisture_required: p.moisture_required,
    moisture_interval_days: p.moisture_interval_days,

    fertilize_required: p.fertilize_required,
    fertilize_interval_days: p.fertilize_interval_days,

    repot_required: p.repot_required,
    repot_interval_months: p.repot_interval_months,
  };
}

export function serializePlantDefinition(p: ApiPlantDefinition): PlantDefinition {
  return {
    id: toIdString(p.id),
    name: pickDisplayName(p),
    latin: p.latin,
    image: p.image ?? null,
    sun: p.sun,
    water: p.water,
    difficulty: p.difficulty,
    popular: true,
  };
}

export function serializePlantSuggestion(p: ApiPlantSuggestion): Suggestion {
  return {
    id: toIdString(p.id),
    name: pickDisplayName(p),
    latin: p.latin.replace(/_/g, " "),
  };
}
