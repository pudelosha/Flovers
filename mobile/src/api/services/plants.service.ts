import { request, ApiError } from "../client";
import type { PlantDefinition } from "../../features/create-plant/types/create-plant.types";
import {
  serializePlantDefinition,
  serializePlantSuggestion,
  type ApiPlantDefinition,
  type ApiPlantSuggestion,
} from "../serializers/plants.serializer";
import { POPULAR_FALLBACK, SEARCH_INDEX_FALLBACK } from "../fallback/plants.fallback";

const ENDPOINTS = {
  popular: "/api/plants/popular/",          // ← include /api prefix
  searchIndex: "/api/plants/search-index/", // ← include /api prefix
  profile: (id: string | number) => `/api/plants/${id}/profile/`,
};

/** Popular cards: includes image + requirements */
export async function fetchPopularPlants(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = { auth: true, useFallbackOnError: true } // ← default auth true
): Promise<PlantDefinition[]> {
  try {
    const data = await request<ApiPlantDefinition[]>(
      ENDPOINTS.popular,
      "GET",
      undefined,
      { auth: opts.auth ?? true } // ← ensure Authorization header
    );
    return (data ?? []).map(serializePlantDefinition);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err; // surface auth problems
    return POPULAR_FALLBACK;
  }
}

/** Search suggestions dataset: no images, just id/name/latin */
export async function fetchPlantSearchIndex(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = { auth: true, useFallbackOnError: true }
) {
  try {
    const data = await request<ApiPlantSuggestion[]>(
      ENDPOINTS.searchIndex,
      "GET",
      undefined,
      { auth: opts.auth ?? true }
    );
    return (data ?? []).map(serializePlantSuggestion);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err;
    return SEARCH_INDEX_FALLBACK.map(serializePlantSuggestion);
  }
}
