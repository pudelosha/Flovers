import { request, ApiError } from "../client";
import type { PlantDefinition } from "../../features/create-plant/types/create-plant.types";
import {
  serializePlantDefinition,
  serializePlantSuggestion,
  type ApiPlantDefinition,
  type ApiPlantSuggestion,
  type ApiPlantProfile,
} from "../serializers/plant-definitions.serializer";
import { POPULAR_FALLBACK, SEARCH_INDEX_FALLBACK } from "../fallback/plants.fallback";

const ENDPOINTS = {
  popular: "/plant-definitions/popular/",
  searchIndex: "/plant-definitions/search-index/",

  profile: (idOrKey: string | number) =>
    typeof idOrKey === "number"
      ? `/plant-definitions/${idOrKey}/profile/`
      : `/plant-definitions/by-key/${encodeURIComponent(idOrKey)}/profile/`,
};

function withLang(url: string, lang?: string) {
  const l = (lang ?? "").trim();
  if (!l) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}lang=${encodeURIComponent(l)}`;
}

export async function fetchPopularPlants(
  opts: { auth?: boolean; useFallbackOnError?: boolean; lang?: string } = {
    auth: true,
    useFallbackOnError: true,
  }
): Promise<PlantDefinition[]> {
  const lang = opts.lang || 'en';

  try {
    const url = withLang(ENDPOINTS.popular, lang);
    const data = await request<ApiPlantDefinition[]>(
      url,
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

export async function fetchPlantSearchIndex(
  opts: { auth?: boolean; useFallbackOnError?: boolean; lang?: string } = {
    auth: true,
    useFallbackOnError: true,
  }
) {
  const lang = opts.lang || 'en';

  try {
    const url = withLang(ENDPOINTS.searchIndex, lang);
    const data = await request<ApiPlantSuggestion[]>(
      url,
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

export async function fetchPlantProfile(idOrExternalId: string | number, opts: { auth?: boolean; lang?: string } = { auth: true }) {
  const url = withLang(ENDPOINTS.profile(idOrExternalId), opts.lang);

  console.log(`Fetching plant profile from URL: ${url}`);

  try {
    const response = await request<ApiPlantProfile>(url, "GET", undefined, { auth: opts.auth ?? true });

    console.log('Received plant profile response:', response);

    if (!response) {
      throw new Error('Received undefined response');
    }

    if (!response.latin) {
      throw new Error('Invalid plant profile response, missing "latin" field');
    }

    return response;

  } catch (error) {
    console.error("Error while fetching plant profile:", error);
    throw new Error(`Failed to fetch plant profile: ${error.message || 'Unknown error'}`);
  }
}
