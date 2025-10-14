import { request, ApiError } from "../client";
import type { PlantDefinition } from "../../features/create-plant/types/create-plant.types";
import {
  serializePlantDefinition,
  serializePlantSuggestion,
  serializePlantProfile,
  type ApiPlantDefinition,
  type ApiPlantSuggestion,
  type ApiPlantProfile,
} from "../serializers/plants.serializer";
import { POPULAR_FALLBACK, SEARCH_INDEX_FALLBACK, getFallbackProfileByName } from "../fallback/plants.fallback";

const ENDPOINTS = {
  popular: "/plants/popular/",            // GET -> ApiPlantDefinition[]
  searchIndex: "/plants/search-index/",   // GET -> ApiPlantSuggestion[] (all or paginated)
  profileById: (id: string) => `/plants/${encodeURIComponent(id)}/profile/`, // GET -> ApiPlantProfile
};

/** Popular cards: includes image + requirements */
export async function fetchPopularPlants(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = { auth: false, useFallbackOnError: true }
): Promise<PlantDefinition[]> {
  try {
    const data = await request<ApiPlantDefinition[]>(ENDPOINTS.popular, "GET", undefined, { auth: !!opts.auth });
    return (data ?? []).map(serializePlantDefinition);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err;
    return POPULAR_FALLBACK;
  }
}

/** Search suggestions dataset: no images, just id/name/latin */
export async function fetchPlantSearchIndex(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = { auth: false, useFallbackOnError: true }
): Promise<ReturnType<typeof serializePlantSuggestion>[]> {
  try {
    const data = await request<ApiPlantSuggestion[]>(ENDPOINTS.searchIndex, "GET", undefined, { auth: !!opts.auth });
    return (data ?? []).map(serializePlantSuggestion);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err;
    return SEARCH_INDEX_FALLBACK.map(serializePlantSuggestion);
  }
}

/** Detailed plant profile by ID (preferred) */
export async function fetchPlantProfileById(
  id: string,
  opts: { auth?: boolean; useFallbackOnError?: boolean; fallbackNameHint?: string } = {
    auth: false,
    useFallbackOnError: true,
  }
) {
  try {
    const data = await request<ApiPlantProfile>(ENDPOINTS.profileById(id), "GET", undefined, { auth: !!opts.auth });
    return serializePlantProfile(data);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err;
    // Use generic or a name-based fallback if provided for nicer UX
    return getFallbackProfileByName(opts.fallbackNameHint);
  }
}
