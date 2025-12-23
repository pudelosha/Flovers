import type {
  PlantDefinition,
  SunRequirement,
  WaterRequirement,
  DifficultyLevel,
  Suggestion,
} from "../../features/create-plant/types/create-plant.types";
import type { PlantProfile, PlantTrait } from "../../features/create-plant/types/create-plant.types";

/**
 * Backend returns:
 * - display_name (localized common name) instead of name
 * - external_id
 * - image / image_thumb (profile has both)
 *
 * This serializer maps display_name -> name so UI and textbox keep the selected value.
 */

/** Full row (popular cards) */
export type ApiPlantDefinition = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string; // legacy
  latin: string;
  image?: string | null; // absolute URL
  sun: SunRequirement;
  water: WaterRequirement;
  difficulty: DifficultyLevel;
};

/** Lightweight row for search */
export type ApiPlantSuggestion = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string; // legacy
  latin: string;
};

/** Raw shape expected from Django for a profile */
export type ApiPlantProfile = {
  id: string | number;
  external_id?: string;
  display_name?: string;
  name?: string; // legacy
  latin: string;

  image?: string | null; // hero absolute URL
  image_thumb?: string | null;
  description?: string;

  // backend currently keeps traits JSON for now; accept multiple shapes safely
  traits?: any;
};

function toIdString(id: string | number | undefined | null) {
  if (typeof id === "string") return id;
  if (typeof id === "number") return String(id);
  return "";
}

function pickDisplayName(p: { display_name?: any; name?: any; latin?: any }) {
  const v = p?.display_name ?? p?.name ?? "";
  const s = typeof v === "string" ? v.trim() : "";
  if (s) return s;
  const latin = typeof p?.latin === "string" ? p.latin.trim() : "";
  return latin;
}

export function serializePlantProfile(p: ApiPlantProfile): PlantProfile {
  // Ensure minimal shape even if server omits something
  const rawTraits = (p as any)?.traits;
  const traits: PlantTrait[] = Array.isArray(rawTraits) ? rawTraits : [];

  return {
    id: toIdString(p?.id),
    name: pickDisplayName(p),
    latin: typeof p?.latin === "string" ? p.latin : "",
    image: (p as any)?.image ?? null,
    // keep existing PlantProfile shape; if your type includes imageThumb, you can add it later
    description: typeof (p as any)?.description === "string" ? (p as any).description : "",
    traits,
  } as any;
}

export function serializePlantDefinition(p: ApiPlantDefinition): PlantDefinition {
  return {
    id: toIdString(p?.id),
    name: pickDisplayName(p),
    latin: typeof p?.latin === "string" ? p.latin : "",
    image: (p as any)?.image ?? null,
    sun: p.sun,
    water: p.water,
    difficulty: p.difficulty,
    // popular flag not required here because this endpoint already filters popular
    popular: true,
  } as any;
}

export function serializePlantSuggestion(p: ApiPlantSuggestion): Suggestion {
  return {
    id: toIdString(p?.id),
    name: pickDisplayName(p),
    latin: typeof p?.latin === "string" ? p.latin : "",
  } as any;
}
