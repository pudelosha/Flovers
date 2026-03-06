import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setAuthToken, onUnauthorized } from "../../api/client";
import {
  AuthUserInfo,
  RegisterPayload,
  registerUser,
  loginUser,
  resendActivation as resendActivationSvc,
  requestPasswordReset as requestPasswordResetSvc,
  resetPassword as resetPasswordSvc,
  confirmEmail as confirmEmailSvc,
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
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  resetPassword: (p: { uid: string; token: string; new_password: string }) => Promise<{ message: string }>;
  confirmEmail: (p: { uid: string; token: string }) => Promise<{ message: string }>;
};

export const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo>(null);

  useEffect(() => {
    (async () => {
      const t = await bootstrapToken();
      setToken(t);
      setAuthToken(t);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setToken((prev) => {
        if (!prev) return prev;

        (async () => {
          await clearToken();
          setAuthToken(null);
          setUser(null);
        })().catch(() => {});

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

    await persistToken(access);

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

  const requestPasswordReset = useCallback(async (email: string) => {
    return requestPasswordResetSvc(email);
  }, []);

  const resetPassword = useCallback(
    async (p: { uid: string; token: string; new_password: string }) => {
      return resetPasswordSvc(p);
    },
    []
  );

  const confirmEmail = useCallback(async (p: { uid: string; token: string }) => {
    return confirmEmailSvc(p);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      token,
      user,
      register,
      login,
      logout,
      resendActivation,
      requestPasswordReset,
      resetPassword,
      confirmEmail,
    }),
    [
      loading,
      token,
      user,
      register,
      login,
      logout,
      resendActivation,
      requestPasswordReset,
      resetPassword,
      confirmEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};