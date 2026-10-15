// A tiny HTTP helper + error class to talk to your Django API.
// - Automatically prefixes requests with API_BASE
// - Optionally attaches JWT Authorization header (when opts.auth === true)
// - Handles both JSON bodies and multipart/FormData bodies correctly
// - Normalizes error handling into a typed ApiError
//
// Authorization token is read from an in-memory variable (setAuthToken),
// not from AsyncStorage on every request.

import { API_BASE_NORM } from "../config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let inMemoryToken: string | null = null;
let authSessionId = 0;

export function setAuthToken(token: string | null) {
  // A login/logout boundary invalidates requests and refreshes from the old session.
  authSessionId += 1;
  inMemoryToken = token;
  refreshInFlight?.cancel();
  refreshInFlight = null;
}

export function getAuthSessionId() {
  return authSessionId;
}

type TokenRefreshConfig = {
  getRefreshToken: () => Promise<string | null>;
  onAccessTokenRefreshed: (token: string, sessionId: number) => Promise<void> | void;
  onRefreshFailed: (sessionId: number) => Promise<void> | void;
};

let tokenRefreshConfig: TokenRefreshConfig | null = null;
let refreshInFlight: { sessionId: number; promise: Promise<string | null>; cancel: () => void } | null = null;

export function configureTokenRefresh(config: TokenRefreshConfig | null) {
  tokenRefreshConfig = config;
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

type RequestOpts = {
  auth?: boolean;
  timeoutMs?: number;
  refreshAuth?: boolean;
  notifyUnauthorized?: boolean;
  // Explicit credentials are reserved for bounded teardown after local logout.
  accessToken?: string;
};

function isAbortError(e: any) {
  const name = String(e?.name ?? "");
  const msg = String(e?.message ?? "").toLowerCase();
  return name === "AbortError" || msg.includes("aborted") || msg.includes("abort");
}

function safeJsonParse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : raw;
  } catch {
    return raw;
  }
}

/**
 * Global unauthorized event (to auto-logout on 401).
 * Avoids circular imports between api client and AuthProvider.
 */
type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(cb: UnauthorizedListener) {
  unauthorizedListeners.add(cb);
  return () => unauthorizedListeners.delete(cb);
}

function emitUnauthorized() {
  unauthorizedListeners.forEach((cb) => {
    try {
      cb();
    } catch {
    }
  });
}

async function performTokenRefresh(timeoutMs: number, sessionId: number): Promise<string | null> {
  const config = tokenRefreshConfig;
  if (!config || sessionId !== authSessionId) {
    return null;
  }

  if (refreshInFlight?.sessionId === sessionId) {
    return refreshInFlight.promise;
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let cancel!: () => void;
  const cancelled = new Promise<null>(resolve => {
    cancel = () => {
      try { controller?.abort(); } catch {}
      resolve(null);
    };
  });
  const work = (async () => {
    const refresh = await config.getRefreshToken();

    if (!refresh || sessionId !== authSessionId) {
      return null;
    }

    let timeoutId: any = null;

    const fetchPromise = fetch(`${API_BASE_NORM}/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
      signal: controller?.signal as any,
    });

    const timeoutPromise = new Promise<Response>((_, reject) => {
      timeoutId = setTimeout(() => {
        try {
          controller?.abort();
        } catch {
        }

        reject(new ApiError(408, { message: "Request timed out" }, "Request timed out"));
      }, timeoutMs);
    });

    let res: Response;
    try {
      const result = await Promise.race([fetchPromise, timeoutPromise, cancelled]);
      if (!result) return null;
      res = result;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    const raw = await res.text().catch(() => "");
    const bodyParsed = isJsonContent(res) ? safeJsonParse(raw) : raw;

    if (!res.ok) {
      return null;
    }

    const nextAccess =
      bodyParsed?.access ?? bodyParsed?.data?.access ?? null;

    if (!nextAccess || typeof nextAccess !== "string") {
      return null;
    }

    if (sessionId !== authSessionId) return null;
    inMemoryToken = nextAccess;
    await config.onAccessTokenRefreshed(nextAccess, sessionId);

    return sessionId === authSessionId ? nextAccess : null;
  })();
  const promise = Promise.race([work, cancelled]).catch(() => null);
  const flight = { sessionId, promise, cancel };
  refreshInFlight = flight;

  try {
    return await promise;
  } finally {
    if (refreshInFlight === flight) refreshInFlight = null;
  }
}

async function requestInternal<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: any,
  opts: RequestOpts = { auth: false, timeoutMs: 15000 },
  hasRetriedAfterRefresh: boolean = false,
  sessionId: number = authSessionId
): Promise<T> {
  const assertCurrentSession = () => {
    if (opts.auth && sessionId !== authSessionId) {
      throw new ApiError(401, { code: "session_changed" }, "Authentication session changed");
    }
  };
  assertCurrentSession();
  const headers: Record<string, string> = {};
  const url = `${API_BASE_NORM}${path}`;
  const requestToken = inMemoryToken;

  if (opts.accessToken) {
    headers.Authorization = `Bearer ${opts.accessToken}`;
  } else if (opts.auth && inMemoryToken) {
    headers.Authorization = `Bearer ${inMemoryToken}`;
  }

  let fetchBody: any = undefined;

  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 15000;

  /**
   * IMPORTANT:
   * AbortController is not consistently reliable across RN environments.
   * If abort doesn't actually cancel fetch, the promise may stay pending forever.
   *
   * So we enforce a hard timeout with Promise.race() and *optionally* abort.
   */
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

  let timeoutId: any = null;

  const fetchPromise = fetch(url, {
    method,
    headers,
    body: fetchBody,
    signal: controller?.signal as any,
  });

  const timeoutPromise = new Promise<Response>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
      }

      reject(new ApiError(408, { message: "Request timed out" }, "Request timed out"));
    }, timeoutMs);
  });

  let res: Response;
  try {
    res = (await Promise.race([fetchPromise, timeoutPromise])) as Response;
  } catch (e: any) {
    if (__DEV__) {
      if (e instanceof ApiError && e.status === 408) {
        console.debug("[api] request timed out", { url, method, timeoutMs });
      } else if (isAbortError(e)) {
        console.debug("[api] request aborted", { url, method, timeoutMs });
      } else {
        console.error("[api] fetch failed", { url, method, error: e });
      }
    }
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const raw = await res.text().catch(() => "");
  assertCurrentSession();

  if (!res.ok) {
    const bodyParsed = isJsonContent(res) ? safeJsonParse(raw) : raw;

    if (res.status === 401 && opts.auth && opts.refreshAuth !== false && !hasRetriedAfterRefresh) {
      // Another request may already have refreshed this session's access token.
      const refreshedAccess = requestToken !== inMemoryToken && inMemoryToken
        ? inMemoryToken
        : await performTokenRefresh(timeoutMs, sessionId);
      assertCurrentSession();

      if (refreshedAccess) {
        return requestInternal<T>(path, method, body, opts, true, sessionId);
      }
    }

    if (res.status === 401 && opts.auth && opts.notifyUnauthorized !== false) {
      const config = tokenRefreshConfig;
      try {
        await config?.onRefreshFailed(sessionId);
      } catch {
      }
      if (sessionId === authSessionId) emitUnauthorized();
    }

    if (__DEV__) {
      const payload = { url, method, status: res.status, body: bodyParsed };

      if (isExpectedStatus(res.status)) {
        console.debug("[api] expected error", payload);
      } else {
        console.error("[api] error", payload);

        try {
          console.error("[api] error JSON", JSON.stringify(bodyParsed, null, 2));
        } catch {
        }
      }
    }

    throw new ApiError(res.status, bodyParsed, `Request failed with status ${res.status}`);
  }

  if (!raw) {
    return undefined as unknown as T;
  }

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

  return raw as unknown as T;
}

export async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: any,
  opts: RequestOpts = { auth: false, timeoutMs: 15000 }
): Promise<T> {
  return requestInternal<T>(path, method, body, opts, false);
}

/** Use the logged-out session's snapshot; never refresh or consult a later login. */
export function requestWithAccessToken<T>(
  path: string,
  method: HttpMethod,
  body: unknown,
  accessToken: string,
  timeoutMs: number
): Promise<T> {
  return requestInternal<T>(path, method, body, {
    auth: false, accessToken, timeoutMs, refreshAuth: false, notifyUnauthorized: false,
  });
}
