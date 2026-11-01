import { readStoredAuth, writeStoredAuth, clearStoredAuth } from "./auth.storage";
import { request, ApiError } from "../client";

export type AuthUserInfo = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
} | null;

export type RegisterPayload = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  lang?: string;
};

export type RegisterResponse = { message: string };

export type LoginPayload = { email: string; password: string };

type LoginApiResponse = {
  access?: string;
  refresh?: string;
  user?: any;
  message?: string;
  data?: {
    access?: string;
    refresh?: string;
    user?: any;
    message?: string;
  };
};

export type LoginResult = {
  access: string;
  refresh: string;
  user: AuthUserInfo;
};

export type ForgotPasswordResponse = { message: string };

export type ResetPasswordPayload = {
  uid: string;
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = { message: string };

export type ConfirmEmailPayload = {
  uid: string;
  token: string;
};

export type ConfirmEmailResponse = { message: string };

let storageGeneration = 0;
let storageQueue: Promise<void> = Promise.resolve();

function serializeStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function bootstrapAuth(): Promise<{
  access: string | null;
  refresh: string | null;
  user: AuthUserInfo;
}> {
  return serializeStorage(async () => {
    return (await readStoredAuth()) ?? { access: null, refresh: null, user: null };
  });
}

export async function persistAuth(
  access: string,
  refresh: string,
  user: AuthUserInfo
): Promise<void> {
  const generation = ++storageGeneration;
  await serializeStorage(async () => {
    if (generation !== storageGeneration) return;
    await writeStoredAuth({ access, refresh, user: user ?? null });
  });
}

export async function updateStoredAccessToken(access: string): Promise<void> {
  const generation = storageGeneration;
  await serializeStorage(async () => {
    if (generation !== storageGeneration) return;
    const auth = await readStoredAuth();
    await writeStoredAuth({ access, refresh: auth?.refresh ?? null, user: auth?.user ?? null });
  });
}

export async function updateStoredUser(user: AuthUserInfo): Promise<void> {
  const generation = storageGeneration;
  await serializeStorage(async () => {
    if (generation !== storageGeneration) return;
    const auth = await readStoredAuth();
    if (auth) await writeStoredAuth({ ...auth, user });
  });
}

export async function clearAuth(): Promise<void> {
  const generation = ++storageGeneration;
  await serializeStorage(async () => {
    if (generation !== storageGeneration) return;
    await clearStoredAuth();
  });
}

// compatibility wrappers (safe to keep if referenced elsewhere)
export async function bootstrapToken(): Promise<string | null> {
  return serializeStorage(async () => (await readStoredAuth())?.access ?? null);
}

export async function persistToken(access: string): Promise<void> {
  await updateStoredAccessToken(access);
}

export async function clearToken(): Promise<void> {
  const generation = ++storageGeneration;
  await serializeStorage(async () => {
    if (generation !== storageGeneration) return;
    const auth = await readStoredAuth();
    if (auth) await writeStoredAuth({ ...auth, access: null });
    else await clearStoredAuth();
  });
}

export async function registerUser(p: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register/", "POST", p);
}

export async function resendActivation(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/auth/resend-activation/", "POST", { email });
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/auth/forgot-password/", "POST", { email });
}

export async function resetPassword(p: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  return request<ResetPasswordResponse>("/auth/reset-password/", "POST", p);
}

export async function confirmEmail(p: ConfirmEmailPayload): Promise<ConfirmEmailResponse> {
  const qs = new URLSearchParams({
    uid: p.uid,
    token: p.token,
  }).toString();

  return request<ConfirmEmailResponse>(`/auth/activate/?${qs}`, "GET");
}

export async function loginUser(p: LoginPayload): Promise<LoginResult> {
  const resp = await request<LoginApiResponse>("/auth/login/", "POST", p);

  const access = resp.access ?? resp.data?.access ?? null;
  const refresh = resp.refresh ?? resp.data?.refresh ?? null;
  const user = (resp.user ?? resp.data?.user ?? null) as AuthUserInfo;

  if (!access || !refresh) {
    throw new ApiError(
      401,
      resp,
      resp?.message ?? resp.data?.message ?? "Invalid email or password"
    );
  }

  return { access, refresh, user };
}
