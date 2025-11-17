import { request, ApiError } from "../client";

export type ApiLocation = {
  id: string;
  name: string;
  category: "indoor" | "outdoor" | "other";
  plant_count?: number;
};

export async function fetchUserLocations(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiLocation[]> {
  const data = await request<ApiLocation[]>(
    "/api/locations/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
  return data ?? [];
}

export async function createLocation(
  payload: { name: string; category: "indoor" | "outdoor" | "other" },
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiLocation> {
  try {
    const data = await request<ApiLocation>(
      "/api/locations/",
      "POST",
      payload,
      { auth: opts.auth ?? true }
    );
    return data;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
      const msg =
        (e.data as any)?.message ||
        (e.data as any)?.detail ||
        "Could not create location.";
      throw new Error(String(msg));
    }
    throw e;
  }
}

export async function deleteLocation(
  id: string,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  try {
    await request<void>(`/api/locations/${id}/`, "DELETE", undefined, {
      auth: opts.auth ?? true,
    });
  } catch (e) {
    // Bubble up readable message for UI (e.g. ProtectedError 409)
    if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
      const msg =
        (e.data as any)?.message ||
        (e.data as any)?.detail ||
        "Could not delete location.";
      throw new Error(String(msg));
    }
    throw e;
  }
}
