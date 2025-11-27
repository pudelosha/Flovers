import { ApiError, request } from "../client";
import type { Suggestion } from "../../features/create-plant/types/create-plant.types";

const ENDPOINTS = {
  scan: "/api/plant-recognition/scan/",
};

export type ApiRecognitionResult = {
  id: number | null;      // always null for now
  name: string;
  latin: string;
  confidence: number;
};

export type ApiRecognitionResponse = {
  results: ApiRecognitionResult[];
};

export async function recognizePlantFromUri(
  uri: string,
  opts: { auth?: boolean } = { auth: true }
): Promise<Suggestion> {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "plant.jpg",
    type: "image/jpeg",
  } as any);

  let data: ApiRecognitionResponse;

  try {
    data = await request<ApiRecognitionResponse>(
      ENDPOINTS.scan,
      "POST",
      form,
      { auth: opts.auth ?? true }
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }

  if (!data?.results?.length) {
    throw new Error("No recognition results returned.");
  }

  const best = data.results[0];

  // id is null now -> treat as custom/ML-only plant
  return {
    id: best.id ?? `ml:${best.latin}`,
    name: best.name,
    latin: best.latin,
  } as Suggestion;
}
