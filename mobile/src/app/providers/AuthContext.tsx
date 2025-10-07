// 1) React + storage + our API client
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { request, ApiError } from "../../api/client";

// 2) Shape of the "user" we keep in memory (can be expanded later)
type UserInfo = { id?: string; email?: string; first_name?: string; last_name?: string } | null;

// 3) What the context exposes to the rest of the app (state + actions)
type AuthContextType = {
  loading: boolean; // 3a) true while we bootstrap (reading token from storage)
  token: string | null; // 3b) JWT access token (null if logged out)
  user: UserInfo;       // 3c) current user info (optional)
  register: (p: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<{message:string}>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  resendActivation: (email: string) => Promise<{message:string}>;
};

// 4) Create the context (we'll provide a real value from the provider below)
export const AuthContext = createContext<AuthContextType>({} as any);

// 5) The provider wraps your app and holds auth state + actions
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 5a) Local state for auth
  const [loading, setLoading] = useState(true);       // true until we load token from AsyncStorage
  const [token, setToken] = useState<string | null>(null); // JWT token
  const [user, setUser] = useState<UserInfo>(null);         // user info (optional)

  // 6) Bootstrap on app start: read token from AsyncStorage
  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("auth_token"); // 6a) read saved token
      setToken(t);                                        // 6b) put it in state (could be null)
      setLoading(false);                                   // 6c) we're done bootstrapping
    })();
  }, []);

  // 7) Register: POST to /api/auth/register/
  //    - returns a message like "Account created. Check your email…"
  const register = useCallback(async (p: { email: string; password: string; first_name?: string; last_name?: string }) => {
    return await request<{ message: string }>("/api/auth/register/", "POST", p);
  }, []);

  // 8) Login: POST to /api/auth/login/
  //    - accepts both payload shapes: { access, user } or { data: { access, user } }
  //    - if no token is returned, we throw an ApiError(401)
  //    - on success, we save token to AsyncStorage and update state
  const login = useCallback(async (p: { email: string; password: string }) => {
    const resp = await request<{
      access?: string;
      refresh?: string;
      user?: any;
      message?: string;
      data?: { access?: string; refresh?: string; user?: any; message?: string };
    }>("/api/auth/login/", "POST", p);

    // 8a) Normalize token/user from either top-level or nested "data"
    const access = resp.access ?? resp.data?.access ?? null;
    const user   = resp.user   ?? resp.data?.user   ?? null;

    // 8b) No token => treat as failed login (even if HTTP 200)
    if (!access) {
      throw new ApiError(401, resp, resp?.message ?? resp.data?.message ?? "Invalid email or password");
    }

    // 8c) Persist token and update in-memory state
    await AsyncStorage.setItem("auth_token", access);
    setToken(access);
    setUser(user);
  }, []);

  // 9) Logout: remove token from storage and reset state
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  }, []);

  // 10) Resend activation email (when user registered but not activated)
  const resendActivation = useCallback(async (email: string) => {
    return await request<{ message: string }>("/api/auth/resend-activation/", "POST", { email });
  }, []);

  // 11) Memoize the context value so consumers don’t re-render unnecessarily
  const value = useMemo(
    () => ({ loading, token, user, register, login, logout, resendActivation }),
    [loading, token, user, register, login, logout, resendActivation]
  );

  // 12) Provide the value to the whole subtree (your app)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
