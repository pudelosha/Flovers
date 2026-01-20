// plant-definitions.service.ts
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

function withLang(url: string, lang?: string) {
  const l = (lang ?? "").trim();
  if (!l) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}lang=${encodeURIComponent(l)}`;
}

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
export async function fetchPlantProfile(idOrExternalId: string | number, opts: { auth?: boolean; lang?: string } = { auth: true }) {
  const url = withLang(ENDPOINTS.profile(idOrExternalId), opts.lang);

  console.log(`Fetching plant profile from URL: ${url}`); // Log the URL

  try {
    const response = await request<ApiPlantProfile>(url, "GET", undefined, { auth: opts.auth ?? true });

    // Log the response object to inspect it
    console.log('Received plant profile response:', response);

    if (!response) {
      throw new Error('Received undefined response');
    }

    // The response should already be a parsed object. Ensure it's valid.
    if (!response.latin) {
      throw new Error('Invalid plant profile response, missing "latin" field');
    }

    return response;

  } catch (error) {
    console.error("Error while fetching plant profile:", error); // Enhanced error logging
    throw new Error(`Failed to fetch plant profile: ${error.message || 'Unknown error'}`);
  }
}

