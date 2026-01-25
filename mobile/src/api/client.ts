// A tiny HTTP helper + error class to talk to your Django API.
// - Automatically prefixes requests with API_BASE
// - Optionally attaches JWT Authorization header (when opts.auth === true)
// - Handles both JSON bodies and multipart/FormData bodies correctly
// - Normalizes error handling into a typed ApiError
//
// Authorization token is read from an in-memory variable (setAuthToken),
// not from AsyncStorage on every request.

import { API_BASE } from "../config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// In-memory token store
let inMemoryToken: string | null = null;

// Call this from AuthProvider when token changes
export function setAuthToken(token: string | null) {
  inMemoryToken = token;
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

/**
 * Expected errors in normal app flows:
 * - 400: validation (missing fields, etc.)
 * - 401: invalid/expired auth
 * - 403: forbidden
 *
 * These should NOT spam redbox in RN dev.
 */
function isExpectedStatus(status: number) {
  return status === 400 || status === 401 || status === 403;
}

export async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: any,
  opts: { auth?: boolean } = { auth: false }
): Promise<T> {
  const headers: Record<string, string> = {};
  const url = `${API_BASE}${path}`;

  // Attach token from memory (no AsyncStorage access here)
  if (opts.auth && inMemoryToken) {
    headers.Authorization = `Bearer ${inMemoryToken}`;
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
    // Network / DNS / connection-level error (worth an error log)
    console.error("[api] fetch failed", { url, method, error: e });
    throw e;
  }

  const raw = await res.text().catch(() => "");

  // Handle non-2xx
  if (!res.ok) {
    const bodyParsed = isJsonContent(res)
      ? (() => {
          try {
            return raw ? JSON.parse(raw) : raw;
          } catch {
            return raw;
          }
        })()
      : raw;

    // Avoid RN redbox for expected 400/401/403 during normal flows
    // RN dev treats console.error specially; console.warn is much less intrusive.
    if (__DEV__) {
      const payload = { url, method, status: res.status, body: bodyParsed };

      if (isExpectedStatus(res.status)) {
        console.warn("[api] expected error", payload);
      } else {
        console.error("[api] error", payload);

        // force-print full JSON for debugging (only for unexpected errors)
        try {
          console.error("[api] error JSON", JSON.stringify(bodyParsed, null, 2));
        } catch {
          // ignore stringify errors
        }
      }
    }

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
      if (__DEV__) {
        console.error("[api] invalid JSON", { url, method, status: res.status, raw });
      }
      throw new ApiError(res.status, raw, "Invalid JSON response");
    }
  }

  // Non-JSON successful response -> return text
  return raw as unknown as T;
}
