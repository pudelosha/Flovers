// C:\Projekty\Python\Flovers\mobile\src\app\providers\AuthContext.tsx
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setAuthToken, onUnauthorized } from "../../api/client";
import {
  AuthUserInfo,
  RegisterPayload,
  registerUser,
  loginUser,
  resendActivation as resendActivationSvc,
  bootstrapToken,
  persistToken,
  clearToken,
} from "../../api/services/auth.service";

type AuthContextType = {
  loading: boolean;
  token: string | null;
  user: AuthUserInfo;
  register: (p: RegisterPayload) => Promise<{ message: string }>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  resendActivation: (email: string) => Promise<{ message: string }>;
};

export const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo>(null);

  // Bootstrap token once and push it into memory for request(auth:true)
  useEffect(() => {
    (async () => {
      const t = await bootstrapToken();
      setToken(t);
      setAuthToken(t);
      setLoading(false);
    })();
  }, []);

  // NEW: auto-logout when api client emits 401
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      // If already logged out, do nothing
      setToken((prev) => {
        if (!prev) return prev;

        // Perform the same logout side-effects (async) without changing your logout() logic
        (async () => {
          await clearToken();
          setAuthToken(null);
          setUser(null);
        })().catch(() => {});

        // switch UI to auth stack immediately
        return null;
      });
    });

    return unsubscribe;
  }, []);

  const register = useCallback(async (p: RegisterPayload) => {
    return registerUser(p);
  }, []);

  const login = useCallback(async (p: { email: string; password: string }) => {
    const { access, user } = await loginUser(p);

    // persist to disk
    await persistToken(access);

    // set in memory + state
    setAuthToken(access);
    setToken(access);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();

    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const resendActivation = useCallback(async (email: string) => {
    return resendActivationSvc(email);
  }, []);

  const value = useMemo(
    () => ({ loading, token, user, register, login, logout, resendActivation }),
    [loading, token, user, register, login, logout, resendActivation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
