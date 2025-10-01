// client.ts
// A tiny HTTP helper + error class to talk to your Django API.
// - Automatically prefixes requests with API_BASE
// - Optionally attaches JWT Authorization header (when opts.auth === true)
// - Normalizes error handling into a typed ApiError

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";

// 1) Restrict method names to the common HTTP verbs we use.
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// 2) Read the saved JWT from AsyncStorage (set in AuthContext on login).
async function getToken() {
  return AsyncStorage.getItem("auth_token");
}

// 3) A typed error you can catch in screens/services.
//    - status: HTTP status code (e.g., 400, 401, 500)
//    - body:   parsed JSON response from the server (if any)
//    - message: human-friendly message (falls back to generic)
export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message?: string) {
    super(message || `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

// 4) The single place to make HTTP requests from the app.
//    Usage examples:
//      request("/api/auth/login/", "POST", { email, password })
//      request("/api/plants/", "GET", undefined, { auth: true })
export async function request<T>(
  path: string,                                 // API path, e.g. "/api/auth/login/"
  method: HttpMethod = "GET",                   // default to GET
  body?: any,                                   // payload for POST/PUT/PATCH
  opts: { auth?: boolean } = { auth: false }    // set auth:true to send Bearer token
): Promise<T> {
  // 4a) Base headers; all API calls send/expect JSON
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // 4b) If this endpoint requires auth, attach Authorization: Bearer <token>
  if (opts.auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // 4c) Perform the fetch against your configured API base
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 4d) Safely parse JSON; some endpoints may return empty body (204/empty 200)
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  // 4e) Normalize errors into ApiError so callers can handle them consistently
  if (!res.ok) {
    // Common case: token missing/expired → bubble up 401 specifically
    if (res.status === 401) {
      throw new ApiError(401, data, data?.message || "Unauthorized");
    }
    // Everything else: pass status + server-provided message if any
    throw new ApiError(res.status, data, data?.message || "Request failed");
  }

  // 4f) Success: return the parsed JSON typed as T
  return data as T;
}
