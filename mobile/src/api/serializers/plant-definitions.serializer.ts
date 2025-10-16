import type {
  PlantDefinition,
  SunRequirement,
  WaterRequirement,
  DifficultyLevel,
  Suggestion,
} from "../../features/create-plant/types/create-plant.types";
import type { PlantProfile, PlantTrait } from "../../features/create-plant/types/create-plant.types";

/** Full row (popular cards) */
export type ApiPlantDefinition = {
  id: string;
  name: string;
  latin: string;
  image?: string | null;        // absolute URL (thumb is enough for popular)
  sun: SunRequirement;
  water: WaterRequirement;
  difficulty: DifficultyLevel;
};

/** Lightweight row for search */
export type ApiPlantSuggestion = {
  id: string;
  name: string;
  latin: string;
};

/** Raw shape expected from Django for a profile */
export type ApiPlantProfile = {
  id: string;
  name: string;
  latin: string;
  image: string;              // absolute URL for the hero image
  description: string;
  traits: { key: string; value: string }[]; // same keys you already use in Step 2
};

export function serializePlantProfile(p: ApiPlantProfile): PlantProfile {
  // Ensure minimal shape even if server omits something
  const traits: PlantTrait[] = Array.isArray(p.traits) ? p.traits : [];
  return {
    id: p.id,
    name: p.name,
    latin: p.latin,
    image: p.image,
    description: p.description,
    traits,
  };
}

export function serializePlantDefinition(p: ApiPlantDefinition): PlantDefinition {
  return {
    id: p.id,
    name: p.name,
    latin: p.latin,
    image: p.image ?? null,
    sun: p.sun,
    water: p.water,
    difficulty: p.difficulty,
    // popular flag not required here because this endpoint already filters popular
    popular: true,
  };
}

export function serializePlantSuggestion(p: ApiPlantSuggestion): Suggestion {
  return { id: p.id, name: p.name, latin: p.latin };
}
