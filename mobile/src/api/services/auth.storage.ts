import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { Platform } from "react-native";
import type { AuthUserInfo } from "./auth.service";

const SERVICE = "com.flovers.mobile.auth.v1";
const ACCOUNT = "flovers-session";
const STATE_KEY = "auth_secure_state_v1";
const LEGACY_KEYS = ["auth_access_token", "auth_refresh_token", "auth_user"];
const options = { service: SERVICE, cloudSync: false };

export type StoredAuth = { access: string | null; refresh: string | null; user: AuthUserInfo };
export class SecureAuthStorageError extends Error {
  readonly code = "secure_auth_storage_unavailable";
  constructor() {
    super("Could not access secure session storage. Please try again.");
  }
}

function parse(value: string): StoredAuth {
  try {
    const data = JSON.parse(value);
    const token = (part: unknown) => part === null || (typeof part === "string" && part.length > 0);
    if (
      data?.version !== 1 ||
      !token(data.access) ||
      !token(data.refresh) ||
      !(data.user === null || (typeof data.user === "object" && !Array.isArray(data.user)))
    )
      throw new Error();
    return { access: data.access, refresh: data.refresh, user: data.user };
  } catch {
    throw new SecureAuthStorageError();
  }
}

async function saveVerified(auth: StoredAuth): Promise<void> {
  const password = JSON.stringify({ version: 1, ...auth });
  // Access/refresh/user are committed as one record. No biometric prompts are
  // required for ordinary login, refresh or background notification work.
  const saved = await Keychain.setGenericPassword(ACCOUNT, password, {
    ...options,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    ...(Platform.OS === "android"
      ? {
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        }
      : {}),
  });
  if (!saved) throw new SecureAuthStorageError();
  const verified = await Keychain.getGenericPassword(options);
  if (!verified || verified.username !== ACCOUNT || verified.password !== password)
    throw new SecureAuthStorageError();
}

/** Calls are serialized by auth.service, including migration and logout. */
export async function readStoredAuth(): Promise<StoredAuth | null> {
  try {
    const state = await AsyncStorage.getItem(STATE_KEY);
    if (state === "signed-out") {
      await AsyncStorage.multiRemove(LEGACY_KEYS);
      // A persisted tombstone wins even if the native reset cannot complete.
      try {
        await Keychain.resetGenericPassword(options);
      } catch {}
      return null;
    }
    if (state === "active") {
      const secure = await Keychain.getGenericPassword(options);
      await AsyncStorage.multiRemove(LEGACY_KEYS);
      if (!secure) {
        await AsyncStorage.setItem(STATE_KEY, "signed-out");
        return null;
      }
      if (secure.username !== ACCOUNT) throw new SecureAuthStorageError();
      return parse(secure.password);
    }
    if (state !== null) throw new SecureAuthStorageError();

    const legacy = await AsyncStorage.multiGet(LEGACY_KEYS);
    const access = legacy[0][1] || null;
    const refresh = legacy[1][1] || null;
    if (!access && !refresh) {
      // Keychain can outlive an iOS uninstall. Without this installation's
      // marker or a legacy session, an old record must never log the user in.
      await clearStoredAuth();
      return null;
    }
    let user: AuthUserInfo = null;
    try {
      const value = JSON.parse(legacy[2][1] || "null");
      if (value && typeof value === "object" && !Array.isArray(value)) user = value;
    } catch {}
    const migrated = { access, refresh, user };
    // Never delete the legacy session before the encrypted copy is verified.
    // A native failure is surfaced; plaintext is never used as a fallback.
    await saveVerified(migrated);
    await AsyncStorage.setItem(STATE_KEY, "active");
    await AsyncStorage.multiRemove(LEGACY_KEYS);
    return migrated;
  } catch {
    throw new SecureAuthStorageError();
  }
}

export async function writeStoredAuth(auth: StoredAuth): Promise<void> {
  try {
    // An interrupted/failed replacement cannot resurrect the previous account.
    await AsyncStorage.setItem(STATE_KEY, "signed-out");
    await saveVerified(auth);
    await AsyncStorage.multiRemove(LEGACY_KEYS);
    await AsyncStorage.setItem(STATE_KEY, "active");
  } catch {
    throw new SecureAuthStorageError();
  }
}

export async function clearStoredAuth(): Promise<void> {
  // Persist denial first, then attempt *both* cleanup paths, even if one fails.
  const marker = await Promise.allSettled([
    Promise.resolve().then(() => AsyncStorage.setItem(STATE_KEY, "signed-out")),
  ]);
  const cleaned = await Promise.allSettled([
    Promise.resolve().then(async () => {
      if (!(await Keychain.resetGenericPassword(options))) throw new SecureAuthStorageError();
    }),
    Promise.resolve().then(() => AsyncStorage.multiRemove(LEGACY_KEYS)),
  ]);
  if ([...marker, ...cleaned].some((result) => result.status === "rejected"))
    throw new SecureAuthStorageError();
}
