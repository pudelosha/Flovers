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

  // Attach auth header if requested
  if (opts.auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let fetchBody: any = undefined;

  // Handle FormData separately (for uploads)
  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: fetchBody,
    });

    // Log the response for debugging
    console.log("Response received: ", res);

    // Check for an invalid response (null or no headers)
    if (!res || !res.headers) {
      console.error("Response object is missing headers or is malformed", res);
      throw new ApiError(res?.status ?? 500, "Invalid response object", "Response object is missing headers");
    }

    // Ensure the response is okay before processing it
    if (!res.ok) {
      const rawError = await res.text();
      console.error("Error response received: ", rawError);
      throw new ApiError(res.status, rawError, `Request failed with status ${res.status}`);
    }

    // Get the response body and check if it's empty
    const raw = await res.text();
    if (!raw) {
      console.error("Empty response body received");
      throw new ApiError(res.status, raw, "Received empty response body");
    }

    // Check if the content type is JSON
    if (isJsonContent(res)) {
      try {
        const data = JSON.parse(raw);
        return data as T;
      } catch (e) {
        console.error("Invalid JSON response: ", raw);
        throw new ApiError(res.status, raw, "Invalid JSON response");
      }
    } else {
      console.error("Non-JSON error response: ", raw);
      throw new ApiError(res.status, raw, "Non-JSON error response");
    }

  } catch (error) {
    console.error("API request failed: ", error);
    throw error;  // Rethrow to propagate error
  }
}


