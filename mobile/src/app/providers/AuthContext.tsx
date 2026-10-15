import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setAuthToken, getAuthSessionId, configureTokenRefresh } from "../../api/client";
import {
  AuthUserInfo, RegisterPayload, registerUser, loginUser,
  resendActivation as resendActivationSvc, requestPasswordReset as requestPasswordResetSvc,
  resetPassword as resetPasswordSvc, confirmEmail as confirmEmailSvc,
  bootstrapAuth, persistAuth, clearAuth, updateStoredAccessToken, updateStoredUser,
} from "../../api/services/auth.service";
import { stopPushNotifications, unregisterPushNotifications } from "../../api/services/push.service";

type AuthContextType = {
  loading: boolean;
  token: string | null;
  user: AuthUserInfo;
  register: (p: RegisterPayload) => Promise<{ message: string }>;
  login: (p: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<NonNullable<AuthUserInfo>>, expectedSession?: number) => Promise<void>;
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
  const accessRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const userRef = useRef<AuthUserInfo>(null);
  const operationRef = useRef(0);

  const logoutSession = useCallback(async (expectedSession?: number) => {
    if (expectedSession !== undefined && expectedSession !== getAuthSessionId()) return;
    ++operationRef.current;
    const previousAccess = accessRef.current;
    // Local logout and durable clearing must not wait for native push or network I/O.
    setAuthToken(null);
    accessRef.current = null;
    refreshRef.current = null;
    userRef.current = null;
    setToken(null);
    setUser(null);
    setLoading(false);
    const clearing = clearAuth();
    void unregisterPushNotifications(previousAccess).catch(() => {});
    await clearing;
  }, []);

  useEffect(() => {
    configureTokenRefresh({
      getRefreshToken: async () => refreshRef.current,
      onAccessTokenRefreshed: async (nextAccess, session) => {
        if (session !== getAuthSessionId()) return;
        accessRef.current = nextAccess;
        setToken(nextAccess);
        await updateStoredAccessToken(nextAccess);
      },
      onRefreshFailed: logoutSession,
    });
    return () => {
      configureTokenRefresh(null);
      setAuthToken(null);
      stopPushNotifications();
    };
  }, [logoutSession]);

  useEffect(() => {
    let active = true;
    const operation = operationRef.current;
    bootstrapAuth().then(auth => {
      if (!active || operation !== operationRef.current) return;
      accessRef.current = auth.access;
      refreshRef.current = auth.refresh;
      userRef.current = auth.user;
      setAuthToken(auth.access);
      setToken(auth.access);
      setUser(auth.user);
    }).catch(() => {
      if (active && operation === operationRef.current) setAuthToken(null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const register = useCallback((p: RegisterPayload) => registerUser(p), []);

  const login = useCallback(async (p: { email: string; password: string }) => {
    const operation = ++operationRef.current;
    const auth = await loginUser(p);
    if (operation !== operationRef.current) return;
    // Queue persistence before exposing the session to refreshes or profile updates.
    const persistence = persistAuth(auth.access, auth.refresh, auth.user);
    setAuthToken(auth.access);
    accessRef.current = auth.access;
    refreshRef.current = auth.refresh;
    userRef.current = auth.user;
    setToken(auth.access);
    setUser(auth.user);
    setLoading(false);
    try {
      await persistence;
    } catch (error) {
      if (operation === operationRef.current) await logoutSession(getAuthSessionId());
      throw error;
    }
  }, [logoutSession]);

  const logout = useCallback(() => logoutSession(), [logoutSession]);
  const updateUser = useCallback(async (patch: Partial<NonNullable<AuthUserInfo>>, expectedSession?: number) => {
    if (expectedSession !== undefined && expectedSession !== getAuthSessionId()) return;
    if (!userRef.current || !accessRef.current) return;
    const nextUser = { ...userRef.current, ...patch };
    const persistence = updateStoredUser(nextUser);
    userRef.current = nextUser;
    setUser(nextUser);
    await persistence;
  }, []);
  const resendActivation = useCallback((email: string) => resendActivationSvc(email), []);
  const requestPasswordReset = useCallback((email: string) => requestPasswordResetSvc(email), []);
  const resetPassword = useCallback((p: { uid: string; token: string; new_password: string }) => resetPasswordSvc(p), []);
  const confirmEmail = useCallback((p: { uid: string; token: string }) => confirmEmailSvc(p), []);

  const value = useMemo(() => ({
    loading, token, user, register, login, logout, updateUser,
    resendActivation, requestPasswordReset, resetPassword, confirmEmail,
  }), [loading, token, user, register, login, logout, updateUser, resendActivation, requestPasswordReset, resetPassword, confirmEmail]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

