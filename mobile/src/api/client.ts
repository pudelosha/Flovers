// client.ts
// A tiny HTTP helper + error class to talk to your Django API.
// - Automatically prefixes requests with API_BASE
// - Optionally attaches JWT Authorization header (when opts.auth === true)
// - Normalizes error handling into a typed ApiError

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function getToken() {
  return AsyncStorage.getItem("auth_token");
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message?: string) {
    super(message || `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

function isJsonContent(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

export async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: any,
  opts: { auth?: boolean } = { auth: false }
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (opts.auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON only if content-type says JSON.
  let data: any = null;
  const raw = await res.text();
  if (raw) {
    if (isJsonContent(res)) {
      try {
        data = JSON.parse(raw);
      } catch (e: any) {
        // Server said JSON but sent something else (e.g., HTML error page)
        if (!res.ok) {
          throw new ApiError(res.status, raw, data?.message || "Invalid JSON error response");
        }
        throw new ApiError(res.status, raw, "Invalid JSON response");
      }
    } else {
      // Not JSON (likely HTML). For errors, surface the raw snippet; for success this is unexpected.
      if (!res.ok) {
        throw new ApiError(res.status, raw, "Non-JSON error response");
      }
      throw new ApiError(res.status, raw, "Unexpected non-JSON response");
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, data, data?.message || "Unauthorized");
    }
    throw new ApiError(res.status, data, data?.message || "Request failed");
  }

  return data as T;
}
