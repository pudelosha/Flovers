import { request, ApiError } from "../client";
import type { PlantDefinition } from "../../features/create-plant/types/create-plant.types";
import {
  serializePlantDefinition,
  serializePlantSuggestion,
  serializePlantProfile,
  type ApiPlantDefinition,
  type ApiPlantSuggestion,
  type ApiPlantProfile,
} from "../serializers/plant-definitions.serializer";
import { POPULAR_FALLBACK, SEARCH_INDEX_FALLBACK } from "../fallback/plants.fallback";

const ENDPOINTS = {
  popular: "/api/plant-definitions/popular/",
  searchIndex: "/api/plant-definitions/search-index/",

  profile: (idOrKey: string | number) =>
    typeof idOrKey === "number"
      ? `/api/plant-definitions/${idOrKey}/profile/`
      : `/api/plant-definitions/by-key/${idOrKey}/profile/`,
};

/** Popular cards */
export async function fetchPopularPlants(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = {
    auth: true,
    useFallbackOnError: true,
  }
): Promise<PlantDefinition[]> {
  try {
    const data = await request<ApiPlantDefinition[]>(
      ENDPOINTS.popular,
      "GET",
      undefined,
      { auth: opts.auth ?? true }
    );
    return (data ?? []).map(serializePlantDefinition);
  } catch (err) {
    if (!opts.useFallbackOnError) throw err;
    if (err instanceof ApiError && err.status === 401) throw err;
    return POPULAR_FALLBACK;
  }
}

/** Search index */
export async function fetchPlantSearchIndex(
  opts: { auth?: boolean; useFallbackOnError?: boolean } = {
    auth: true,
    useFallbackOnError: true,
  }
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

/** Full plant profile */
export async function fetchPlantProfile(
  idOrExternalId: string | number,
  opts: { auth?: boolean } = { auth: true }
) {
  const data = await request<ApiPlantProfile>(
    ENDPOINTS.profile(idOrExternalId),
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
  return serializePlantProfile(data);
}
