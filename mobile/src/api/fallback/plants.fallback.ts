import type { PlantDefinition } from "../../features/create-plant/types/create-plant.types";
import type { ApiPlantSuggestion } from "../serializers/plant-definitions.serializer";
import type { PlantProfile } from "../../features/create-plant/types/create-plant.types";
import { PLANT_PROFILES_MOCK } from "../../features/create-plant/constants/create-plant.constants";

export const POPULAR_FALLBACK: PlantDefinition[] = [
  {
    id: "p1",
    name: "Monstera",
    latin: "Monstera deliciosa",
    image: "https://images.unsplash.com/photo-1551970634-747846a548cb?w=400",
    sun: "medium",
    water: "medium",
    difficulty: "easy",
    popular: true,
  },
  {
    id: "p6",
    name: "Snake Plant",
    latin: "Sansevieria trifasciata",
    image: "https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=400",
    sun: "low",
    water: "low",
    difficulty: "easy",
    popular: true,
  },
];

export const SEARCH_INDEX_FALLBACK: ApiPlantSuggestion[] = [
  { id: "p1", name: "Monstera", latin: "Monstera deliciosa" },
  { id: "p6", name: "Snake Plant", latin: "Sansevieria trifasciata" },
  { id: "p8", name: "Pothos", latin: "Epipremnum aureum" },
  { id: "p11", name: "Fiddle Leaf Fig", latin: "Ficus lyrata" },
];

/** Build a “by-name” fallback profile map from your existing const */
function mapMockToProfiles(): Record<string, PlantProfile> {
  const map: Record<string, PlantProfile> = {};
  Object.entries(PLANT_PROFILES_MOCK).forEach(([key, val]) => {
    map[key] = {
      image: val.image,
      description: val.description,
      traits: val.traits.map(t => ({ key: t.key, value: t.value })),
      // name/latin optional, can be filled when coming from API
    };
  });
  return map;
}

export const PLANT_PROFILES_FALLBACK_BY_NAME: Record<string, PlantProfile> = mapMockToProfiles();

/** Handy helpers */
export function getFallbackProfileByName(name?: string): PlantProfile {
  if (name && PLANT_PROFILES_FALLBACK_BY_NAME[name]) {
    return PLANT_PROFILES_FALLBACK_BY_NAME[name];
  }
  return PLANT_PROFILES_FALLBACK_BY_NAME.generic; // safe default
}
