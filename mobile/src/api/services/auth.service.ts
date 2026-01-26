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

  // Your RegisterScreen sends this:
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
  user: AuthUserInfo;
};

const TOKEN_KEY = "auth_token";

export async function bootstrapToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function persistToken(access: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, access);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function registerUser(p: RegisterPayload): Promise<RegisterResponse> {
  return request<RegisterResponse>("/api/auth/register/", "POST", p);
}

export async function resendActivation(email: string): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/resend-activation/", "POST", { email });
}

export async function loginUser(p: LoginPayload): Promise<LoginResult> {
  const resp = await request<LoginApiResponse>("/api/auth/login/", "POST", p);

  const access = resp.access ?? resp.data?.access ?? null;
  const user = (resp.user ?? resp.data?.user ?? null) as AuthUserInfo;

  if (!access) {
    throw new ApiError(
      401,
      resp,
      resp?.message ?? resp.data?.message ?? "Invalid email or password"
    );
  }

  return { access, user };
}
