// client.ts
// A tiny HTTP helper + error class to talk to your Django API.
// - Automatically prefixes requests with API_BASE
// - Optionally attaches JWT Authorization header (when opts.auth === true)
// - Handles both JSON bodies and multipart/FormData bodies correctly
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
  const headers: Record<string, string> = {};
  const url = `${API_BASE}${path}`;

  if (opts.auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let fetchBody: any = undefined;

  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: fetchBody,
    });
  } catch (e) {
    // Network / DNS / connection-level error
    console.error("[api] fetch failed", { url, method, error: e });
    throw e;
  }

  const raw = await res.text().catch(() => "");

  // Handle non-2xx
  if (!res.ok) {
    // Try to parse JSON error bodies if possible
    const bodyParsed = isJsonContent(res)
      ? (() => {
          try {
            return raw ? JSON.parse(raw) : raw;
          } catch {
            return raw;
          }
        })()
      : raw;

    console.error("[api] error", {
      url,
      method,
      status: res.status,
      body: bodyParsed,
    });

    throw new ApiError(res.status, bodyParsed, `Request failed with status ${res.status}`);
  }

  // Handle empty responses (valid for 204, DELETE, etc.)
  if (!raw) {
    return undefined as unknown as T;
  }

  // JSON response
  if (isJsonContent(res)) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.error("[api] invalid JSON", { url, method, status: res.status, raw });
      throw new ApiError(res.status, raw, "Invalid JSON response");
    }
  }

  // Non-JSON successful response -> return text
  return raw as unknown as T;
}
