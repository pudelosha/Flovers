import * as Keychain from "react-native-keychain";
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

  it("serializes a slow encrypted access write before logout and the next login", async () => {
    await persistAuth("access-a", "refresh-a", { email: "a@example.com" });
    const mockedSet = Keychain.setGenericPassword as jest.Mock;
    const normalSet = mockedSet.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    mockedSet.mockImplementation((username, value, options) => JSON.parse(value).access === "late-access-a"
      ? gate.then(() => normalSet(username, value, options)) : normalSet(username, value, options));
    try {
      const oldWrite = updateStoredAccessToken("late-access-a");
      for (let i=0;i<20;i++) await Promise.resolve();
      const logout = clearAuth();
      const login = persistAuth("access-b", "refresh-b", { email: "b@example.com" });
      release(); await Promise.all([oldWrite, logout, login]);
      await expect(bootstrapAuth()).resolves.toEqual({access:"access-b",refresh:"refresh-b",user:{email:"b@example.com"}});
    } finally { mockedSet.mockImplementation(normalSet); }
  });

  it("waits for failed native writes to settle before clearing the session", async () => {
    const mockedSet=Keychain.setGenericPassword as jest.Mock;
    const normalSet=mockedSet.getMockImplementation()!;
    const mockedReset=Keychain.resetGenericPassword as jest.Mock;
    mockedReset.mockClear();
    let release!: () => void;
    const gate=new Promise<void>(done=>{release=done;});
    mockedSet.mockImplementation(()=>gate.then(()=>{throw new Error("native failure");}));
    try {
      const login=persistAuth("access-a","refresh-a",{email:"a@example.com"});
      const failed=expect(login).rejects.toMatchObject({code:"secure_auth_storage_unavailable"});
      for(let i=0;i<20;i++) await Promise.resolve();
      const logout=clearAuth();
      for(let i=0;i<10;i++) await Promise.resolve();
      expect(mockedReset).not.toHaveBeenCalled();
      release();await failed;await logout;
      await expect(bootstrapAuth()).resolves.toEqual({access:null,refresh:null,user:null});
    } finally {mockedSet.mockImplementation(normalSet);}
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
