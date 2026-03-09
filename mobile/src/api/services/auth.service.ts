import AsyncStorage from "@react-native-async-storage/async-storage";
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

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

export async function bootstrapAuth(): Promise<{
  access: string | null;
  refresh: string | null;
  user: AuthUserInfo;
}> {
  const [access, refresh, userRaw] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);

  let user: AuthUserInfo = null;

  try {
    user = userRaw ? (JSON.parse(userRaw) as AuthUserInfo) : null;
  } catch {
    user = null;
  }

  return { access, refresh, user };
}

export async function persistAuth(
  access: string,
  refresh: string,
  user: AuthUserInfo
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(ACCESS_TOKEN_KEY, access),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user ?? null)),
  ]);
}

export async function updateStoredAccessToken(access: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, access);
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

// compatibility wrappers (safe to keep if referenced elsewhere)
export async function bootstrapToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function persistToken(access: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, access);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function registerUser(p: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/auth/register/", "POST", p);
}

export async function resendActivation(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/resend-activation/", "POST", { email });
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>("/api/auth/forgot-password/", "POST", { email });
}

export async function resetPassword(p: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  return request<ResetPasswordResponse>("/api/auth/reset-password/", "POST", p);
}

export async function confirmEmail(p: ConfirmEmailPayload): Promise<ConfirmEmailResponse> {
  const qs = new URLSearchParams({
    uid: p.uid,
    token: p.token,
  }).toString();

  return request<ConfirmEmailResponse>(`/api/auth/activate/?${qs}`, "GET");
}

export async function loginUser(p: LoginPayload): Promise<LoginResult> {
  const resp = await request<LoginApiResponse>("/api/auth/login/", "POST", p);

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