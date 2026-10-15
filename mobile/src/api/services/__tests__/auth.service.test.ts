import AsyncStorage from "@react-native-async-storage/async-storage";
import { request, ApiError } from "../../client";
import {
  bootstrapAuth,
  bootstrapToken,
  clearAuth,
  clearToken,
  confirmEmail,
  loginUser,
  persistAuth,
  persistToken,
  registerUser,
  requestPasswordReset,
  resendActivation,
  resetPassword,
  updateStoredAccessToken,
  updateStoredUser,
} from "../auth.service";

jest.mock("../../client", () => {
  class MockApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown, message: string) {
      super(message);
      this.status = status;
      this.body = body;
    }
  }

  return {
    request: jest.fn(),
    ApiError: MockApiError,
  };
});

const mockedRequest = request as jest.Mock;

describe("auth.service", () => {
  beforeEach(async () => {
    mockedRequest.mockReset();
    await AsyncStorage.clear();
  });

  it("persists, bootstraps and clears auth state", async () => {
    await persistAuth("access-1", "refresh-1", {
      id: "7",
      email: "test@example.com",
    });

    await expect(bootstrapAuth()).resolves.toEqual({
      access: "access-1",
      refresh: "refresh-1",
      user: { id: "7", email: "test@example.com" },
    });

    await updateStoredAccessToken("access-2");
    await expect(bootstrapToken()).resolves.toBe("access-2");

    await clearToken();
    await expect(bootstrapToken()).resolves.toBeNull();

    await persistAuth("access-3", "refresh-3", null);
    await clearAuth();
    await expect(bootstrapAuth()).resolves.toEqual({
      access: null,
      refresh: null,
      user: null,
    });
  });

  it("supports legacy token helpers", async () => {
    await persistToken("token");
    await expect(bootstrapToken()).resolves.toBe("token");
    await clearToken();
    await expect(bootstrapToken()).resolves.toBeNull();
  });

  it("serializes a slow old access write before logout and the next login", async () => {
    await persistAuth("access-a", "refresh-a", { email: "a@example.com" });
    const mockedSet = AsyncStorage.setItem as jest.Mock;
    const normalSet = mockedSet.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    mockedSet.mockImplementation((key, value) => value === "late-access-a" ? gate.then(() => normalSet(key, value)) : normalSet(key, value));
    try {
      const oldWrite = updateStoredAccessToken("late-access-a");
      for (let i = 0; i < 5; i++) await Promise.resolve();
      const logout = clearAuth();
      const login = persistAuth("access-b", "refresh-b", { email: "b@example.com" });
      release();
      await Promise.all([oldWrite, logout, login]);
      await expect(bootstrapAuth()).resolves.toEqual({ access: "access-b", refresh: "refresh-b", user: { email: "b@example.com" } });
    } finally { mockedSet.mockImplementation(normalSet); }
  });

  it("waits for sibling writes after a storage failure before clearing the session", async () => {
    const mockedSet = AsyncStorage.setItem as jest.Mock;
    const normalSet = mockedSet.getMockImplementation()!;
    const mockedRemove = AsyncStorage.removeItem as jest.Mock;
    mockedRemove.mockClear();
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    mockedSet.mockImplementation((key, value) => {
      if (key === "auth_access_token") return Promise.reject(new Error("Disk failure"));
      if (key === "auth_refresh_token") return gate.then(() => normalSet(key, value));
      return normalSet(key, value);
    });
    try {
      const login = persistAuth("access-a", "refresh-a", { email: "a@example.com" });
      const failed = expect(login).rejects.toThrow("Disk failure");
      for (let i = 0; i < 6; i++) await Promise.resolve();
      const logout = clearAuth();
      for (let i = 0; i < 6; i++) await Promise.resolve();
      expect(mockedRemove).not.toHaveBeenCalled();
      release();
      await failed;
      await logout;
      await expect(bootstrapAuth()).resolves.toEqual({ access: null, refresh: null, user: null });
    } finally { mockedSet.mockImplementation(normalSet); }
  });

  it("updates the cached email without replacing the stored tokens", async () => {
    await persistAuth("access", "refresh", { id: "7", email: "old@example.com" });
    await updateStoredUser({ id: "7", email: "new@example.com" });
    await expect(bootstrapAuth()).resolves.toEqual({ access: "access", refresh: "refresh", user: { id: "7", email: "new@example.com" } });
  });

  it("calls register, activation and password endpoints", async () => {
    mockedRequest.mockResolvedValue({ message: "ok" });

    await registerUser({
      email: "new@example.com",
      password: "secret",
      lang: "en",
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/register/",
      "POST",
      { email: "new@example.com", password: "secret", lang: "en" }
    );

    await resendActivation("new@example.com");
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/resend-activation/",
      "POST",
      { email: "new@example.com" }
    );

    await requestPasswordReset("new@example.com");
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/forgot-password/",
      "POST",
      { email: "new@example.com" }
    );

    await resetPassword({
      uid: "abc",
      token: "token",
      new_password: "new-secret",
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/reset-password/",
      "POST",
      { uid: "abc", token: "token", new_password: "new-secret" }
    );

    await confirmEmail({ uid: "abc", token: "token/value" });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/auth/activate/?uid=abc&token=token%2Fvalue",
      "GET"
    );
  });

  it("normalizes login envelopes and rejects responses without tokens", async () => {
    mockedRequest.mockResolvedValueOnce({
      data: {
        access: "access",
        refresh: "refresh",
        user: { email: "test@example.com" },
      },
    });

    await expect(
      loginUser({ email: "test@example.com", password: "secret" })
    ).resolves.toEqual({
      access: "access",
      refresh: "refresh",
      user: { email: "test@example.com" },
    });

    mockedRequest.mockResolvedValueOnce({ message: "Nope" });

    await expect(
      loginUser({ email: "test@example.com", password: "wrong" })
    ).rejects.toBeInstanceOf(ApiError);
  });
});
