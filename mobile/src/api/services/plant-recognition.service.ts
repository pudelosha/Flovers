import { ApiError, request } from "../client";

const ENDPOINTS = {
  scan: "/api/plant-recognition/scan/",
};

export type ApiRecognitionResult = {
  id: number | null; // currently null
  name: string;
  latin: string;

  // new field from backend (0..1)
  probability: number;

  // optional legacy field (0..1)
  confidence?: number;
};

export type ApiRecognitionResponse = {
  results: ApiRecognitionResult[];
};

export async function recognizePlantFromUri(
  uri: string,
  opts: { auth?: boolean; topk?: number } = { auth: true, topk: 3 }
): Promise<ApiRecognitionResponse> {
  const form = new FormData();
  form.append("image", {
    uri,
    name: "plant.jpg",
    type: "image/jpeg",
  } as any);

  form.append("topk", String(opts.topk ?? 3));

  let data: ApiRecognitionResponse;

  try {
    data = await request<ApiRecognitionResponse>(ENDPOINTS.scan, "POST", form, {
      auth: opts.auth ?? true,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }

  if (!data?.results?.length) {
    throw new Error("No recognition results returned.");
  }

  const topk = opts.topk ?? 3;

  // sort best-first defensively and cap
  const sorted = [...data.results].sort((a, b) => {
    const ap = a.probability ?? a.confidence ?? 0;
    const bp = b.probability ?? b.confidence ?? 0;
    return bp - ap;
  });

  return { results: sorted.slice(0, topk) };
}
