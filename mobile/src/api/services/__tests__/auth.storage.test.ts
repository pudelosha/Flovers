import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";
import {
  bootstrapAuth,
  clearAuth,
  persistAuth,
  updateStoredAccessToken,
  updateStoredUser,
} from "../auth.service";

const SERVICE = "com.flovers.mobile.auth.v1";
const STATE = "auth_secure_state_v1";
const legacyKeys = ["auth_access_token", "auth_refresh_token", "auth_user"];
const old = {
  access: "legacy-access",
  refresh: "legacy-refresh",
  user: { id: "7", email: "owner@example.test" },
};
const empty = { access: null, refresh: null, user: null };
async function seedLegacy() {
  await AsyncStorage.multiSet([
    [legacyKeys[0], old.access],
    [legacyKeys[1], old.refresh],
    [legacyKeys[2], JSON.stringify(old.user)],
  ]);
}
async function seedSecure(auth: any = old, username = "flovers-session") {
  await Keychain.setGenericPassword(username, JSON.stringify({ version: 1, ...auth }), {
    service: SERVICE,
  });
}
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
afterEach(() => jest.restoreAllMocks());

it("migrates a legacy login only after verifying the encrypted copy and removes every plaintext credential", async () => {
  await seedLegacy();
  const removed = AsyncStorage.multiRemove as jest.Mock;
  const original = removed.getMockImplementation()!;
  removed.mockImplementation(async (keys) => {
    expect(await Keychain.getGenericPassword({ service: SERVICE })).toMatchObject({
      password: expect.stringContaining(old.refresh),
    });
    return original(keys);
  });
  try {
    await expect(bootstrapAuth()).resolves.toEqual(old);
    expect(await AsyncStorage.multiGet(legacyKeys)).toEqual(legacyKeys.map((key) => [key, null]));
    expect(await AsyncStorage.getItem(STATE)).toBe("active");
    await expect(bootstrapAuth()).resolves.toEqual(old);
  } finally {
    removed.mockImplementation(original);
  }
});

it.each(["set", "verify"])(
  "does not use or delete the legacy session when secure %s fails",
  async (mode) => {
    await seedLegacy();
    const method = (
      mode === "set" ? Keychain.setGenericPassword : Keychain.getGenericPassword
    ) as jest.Mock;
    method.mockRejectedValueOnce(new Error("unavailable"));
    await expect(bootstrapAuth()).rejects.toMatchObject({
      code: "secure_auth_storage_unavailable",
    });
    expect(await AsyncStorage.getItem(legacyKeys[0])).toBe(old.access);
    expect(await AsyncStorage.getItem(STATE)).toBeNull();
    // A later successful boot can retry migration without a forced sign-in.
    await expect(bootstrapAuth()).resolves.toEqual(old);
  }
);

it("does not accept an unverified native write returning false", async () => {
  await seedLegacy();
  (Keychain.setGenericPassword as jest.Mock).mockResolvedValueOnce(false);
  await expect(bootstrapAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
  expect(await AsyncStorage.getItem(legacyKeys[1])).toBe(old.refresh);
});

it("does not expose a migrated session until plaintext cleanup succeeds", async () => {
  await seedLegacy();
  (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(new Error("disk unavailable"));
  await expect(bootstrapAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
  await expect(bootstrapAuth()).resolves.toEqual(old);
  expect(await AsyncStorage.multiGet(legacyKeys)).toEqual(legacyKeys.map((key) => [key, null]));
});

it("never writes credentials to AsyncStorage for login, refresh or profile changes", async () => {
  await persistAuth("new-access", "new-refresh", old.user);
  await updateStoredAccessToken("updated-access");
  await updateStoredUser({ ...old.user, email: "new@example.test" });
  const writes = (AsyncStorage.setItem as jest.Mock).mock.calls;
  expect(writes.length).toBeGreaterThan(0);
  expect(
    writes.every(([key, value]) => key === STATE && ["active", "signed-out"].includes(value))
  ).toBe(true);
  expect(
    (AsyncStorage.multiSet as jest.Mock).mock.calls.every(([pairs]) =>
      pairs.every(
        ([key, value]: string[]) => key === STATE && ["active", "signed-out"].includes(value)
      )
    )
  ).toBe(true);
  await expect(bootstrapAuth()).resolves.toEqual({
    access: "updated-access",
    refresh: "new-refresh",
    user: { ...old.user, email: "new@example.test" },
  });
});

it("uses AES-GCM backed by Android Keystore without a biometric gate", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  await persistAuth(old.access, old.refresh, old.user);
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
    "flovers-session",
    expect.any(String),
    expect.objectContaining({
      service: SERVICE,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
    })
  );
  const options = (Keychain.setGenericPassword as jest.Mock).mock.calls[0][2];
  expect(options.accessControl).toBeUndefined();
});

it("uses a device-only iOS Keychain item without iCloud syncing", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  await persistAuth(old.access, old.refresh, old.user);
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
    "flovers-session",
    expect.any(String),
    expect.objectContaining({
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      cloudSync: false,
    })
  );
});

it("does not restore an old iOS Keychain session on a fresh installation", async () => {
  jest.replaceProperty(Platform, "OS", "ios");
  await seedSecure();
  await expect(bootstrapAuth()).resolves.toEqual(empty);
  expect(await Keychain.getGenericPassword({ service: SERVICE })).toBe(false);
});

it("never falls back to leftover plaintext when an active secure record is missing", async () => {
  await seedLegacy();
  await AsyncStorage.setItem(STATE, "active");
  await expect(bootstrapAuth()).resolves.toEqual(empty);
  expect(await AsyncStorage.multiGet(legacyKeys)).toEqual(legacyKeys.map((key) => [key, null]));
});

it("prefers the current secure account over stale legacy credentials", async () => {
  await seedLegacy();
  await seedSecure({ access: "account-b", refresh: "refresh-b", user: null });
  await AsyncStorage.setItem(STATE, "active");
  await expect(bootstrapAuth()).resolves.toEqual({
    access: "account-b",
    refresh: "refresh-b",
    user: null,
  });
});

it.each([
  "not-json",
  JSON.stringify({ version: 2, access: "bad", refresh: "bad", user: null }),
  JSON.stringify({ version: 1, access: 42, refresh: "bad", user: null }),
])("rejects malformed secure records without plaintext fallback", async (password) => {
  await seedLegacy();
  await Keychain.setGenericPassword("flovers-session", password, { service: SERVICE });
  await AsyncStorage.setItem(STATE, "active");
  await expect(bootstrapAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
});

it("persists logout denial even when native deletion fails, so the session cannot return on restart", async () => {
  await persistAuth(old.access, old.refresh, old.user);
  (Keychain.resetGenericPassword as jest.Mock).mockRejectedValueOnce(new Error("locked"));
  await expect(clearAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
  expect(await AsyncStorage.getItem(STATE)).toBe("signed-out");
  await expect(bootstrapAuth()).resolves.toEqual(empty);
});

it("still deletes encrypted data when writing the logout marker fails", async () => {
  await persistAuth(old.access, old.refresh, old.user);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk failure"));
  await expect(clearAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
  expect(await Keychain.getGenericPassword({ service: SERVICE })).toBe(false);
  await expect(bootstrapAuth()).resolves.toEqual(empty);
});

it("keeps a failed replacement login from restoring the previous account", async () => {
  await persistAuth(old.access, old.refresh, old.user);
  (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(
    new Error("keystore unavailable")
  );
  await expect(persistAuth("account-b", "refresh-b", null)).rejects.toMatchObject({
    code: "secure_auth_storage_unavailable",
  });
  await expect(bootstrapAuth()).resolves.toEqual(empty);
});

it("serializes a migration against logout so late migration writes cannot restore the account", async () => {
  await seedLegacy();
  const writer = Keychain.setGenericPassword as jest.Mock;
  const original = writer.getMockImplementation()!;
  let release!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  writer.mockImplementation((...args: any[]) => gate.then(() => original(...args)));
  try {
    const migrating = bootstrapAuth();
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(writer).toHaveBeenCalled();
    const logout = clearAuth();
    release();
    await migrating;
    await logout;
    await expect(bootstrapAuth()).resolves.toEqual(empty);
  } finally {
    writer.mockImplementation(original);
  }
});

it("waits for every cleanup operation before releasing the storage queue after an error", async () => {
  await persistAuth(old.access, old.refresh, old.user);
  const cleaner = AsyncStorage.multiRemove as jest.Mock;
  const original = cleaner.getMockImplementation()!;
  let release!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  cleaner.mockImplementationOnce((keys) => gate.then(() => original(keys)));
  (Keychain.resetGenericPassword as jest.Mock).mockRejectedValueOnce(new Error("native error"));
  const clearing = clearAuth();
  const failed = expect(clearing).rejects.toMatchObject({
    code: "secure_auth_storage_unavailable",
  });
  for (let i = 0; i < 20; i++) await Promise.resolve();
  const next = persistAuth("next", "next-refresh", null);
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(await AsyncStorage.getItem(STATE)).toBe("signed-out");
  release();
  await failed;
  await next;
  await expect(bootstrapAuth()).resolves.toEqual({
    access: "next",
    refresh: "next-refresh",
    user: null,
  });
});

it("attempts both logout cleanup paths even when a storage bridge throws synchronously", async () => {
  await persistAuth(old.access, old.refresh, old.user);
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => {
    throw new Error("bridge unavailable");
  });
  (Keychain.resetGenericPassword as jest.Mock).mockImplementationOnce(() => {
    throw new Error("native unavailable");
  });
  (AsyncStorage.multiRemove as jest.Mock).mockClear();
  await expect(clearAuth()).rejects.toMatchObject({ code: "secure_auth_storage_unavailable" });
  expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(legacyKeys);
});
