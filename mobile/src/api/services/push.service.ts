import { Platform, PermissionsAndroid } from "react-native";
import messaging, { AuthorizationStatus } from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { request } from "../client";

/** Common API envelope */
type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T;
  errors?: Record<string, unknown>;
};

/** Backend push-device response */
export type ApiPushDevice = {
  token: string;
  platform: "android" | "ios";
  is_active: boolean;
  last_seen_at: string;
};

let started = false;
let tokenRefreshUnsub: null | (() => void) = null;

/**
 * Ensure Android notification channel exists
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await notifee.createChannel({
    id: "default",
    name: "Default",
    importance: AndroidImportance.HIGH,
  });
}

/**
 * Ensure notification permission (Android 13+ + iOS)
 */
async function ensurePushPermission() {
  if (Platform.OS === "android") {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Register or refresh FCM token in backend.
 * Auth header is injected by request(..., { auth: true }).
 */
async function registerTokenToBackend(token: string) {
  await request<ApiEnvelope<ApiPushDevice>>(
    "/api/profile/push-devices/",
    "POST",
    {
      token,
      platform: "android",
    },
    { auth: true }
  );
}

/**
 * Get current FCM token and send it to backend.
 */
async function syncCurrentToken() {
  const token = await messaging().getToken();
  if (!token) return;
  await registerTokenToBackend(token);
}

/**
 * Call once after user login (JWT present).
 * Safe to call multiple times.
 */
export async function startPushNotifications() {
  if (started) return;
  started = true;

  await ensurePushPermission();
  await ensureAndroidChannel();

  // Initial registration
  await syncCurrentToken();

  // Token rotation
  tokenRefreshUnsub = messaging().onTokenRefresh(async newToken => {
    try {
      if (newToken) await registerTokenToBackend(newToken);
    } catch {
      // silent fail
    }
  });

  // Foreground messages (Android does NOT auto-display)
  messaging().onMessage(async remoteMessage => {
    const title = remoteMessage.notification?.title ?? "Flovers";
    const body = remoteMessage.notification?.body ?? "";

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: "default",
      },
    });
  });
}

/**
 * Optional cleanup on logout.
 */
export function stopPushNotifications() {
  if (tokenRefreshUnsub) {
    tokenRefreshUnsub();
    tokenRefreshUnsub = null;
  }
  started = false;
}
