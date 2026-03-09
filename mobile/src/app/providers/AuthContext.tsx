import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setAuthToken, onUnauthorized, configureTokenRefresh } from "../../api/client";
import {
  AuthUserInfo,
  RegisterPayload,
  registerUser,
  loginUser,
  resendActivation as resendActivationSvc,
  requestPasswordReset as requestPasswordResetSvc,
  resetPassword as resetPasswordSvc,
  confirmEmail as confirmEmailSvc,
  bootstrapAuth,
  persistAuth,
  clearAuth,
  updateStoredAccessToken,
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
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo>(null);

  useEffect(() => {
    (async () => {
      const auth = await bootstrapAuth();
      setToken(auth.access);
      setRefreshToken(auth.refresh);
      setUser(auth.user);
      setAuthToken(auth.access);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    configureTokenRefresh({
      getRefreshToken: async () => refreshToken,
      onAccessTokenRefreshed: async (newAccessToken: string) => {
        setAuthToken(newAccessToken);
        setToken(newAccessToken);
        await updateStoredAccessToken(newAccessToken);
      },
      onRefreshFailed: async () => {
        await clearAuth();
        setAuthToken(null);
        setToken(null);
        setRefreshToken(null);
        setUser(null);
      },
    });
  }, [refreshToken]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setToken((prev) => {
        if (!prev) return prev;

        (async () => {
          await clearAuth();
          setAuthToken(null);
          setRefreshToken(null);
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
    const { access, refresh, user } = await loginUser(p);

    await persistAuth(access, refresh, user);

    setAuthToken(access);
    setToken(access);
    setRefreshToken(refresh);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();

    setAuthToken(null);
    setToken(null);
    setRefreshToken(null);
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