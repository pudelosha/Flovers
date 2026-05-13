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

  it("calls register, activation and password endpoints", async () => {
    mockedRequest.mockResolvedValue({ message: "ok" });

    await registerUser({
      email: "new@example.com",
      password: "secret",
      lang: "en",
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/register/",
      "POST",
      { email: "new@example.com", password: "secret", lang: "en" }
    );

    await resendActivation("new@example.com");
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/resend-activation/",
      "POST",
      { email: "new@example.com" }
    );

    await requestPasswordReset("new@example.com");
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/forgot-password/",
      "POST",
      { email: "new@example.com" }
    );

    await resetPassword({
      uid: "abc",
      token: "token",
      new_password: "new-secret",
    });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/reset-password/",
      "POST",
      { uid: "abc", token: "token", new_password: "new-secret" }
    );

    await confirmEmail({ uid: "abc", token: "token/value" });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/auth/activate/?uid=abc&token=token%2Fvalue",
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
