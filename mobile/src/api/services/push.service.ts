import { Platform, PermissionsAndroid } from "react-native";
import messaging, { AuthorizationStatus } from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { request } from "../client";

type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T;
  errors?: Record<string, unknown>;
};

export type ApiPushDevice = {
  token: string;
  platform: "android" | "ios";
  is_active: boolean;
  last_seen_at: string;
};

let started = false;
let tokenRefreshUnsub: null | (() => void) = null;
let onMessageUnsub: null | (() => void) = null;

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await notifee.createChannel({
    id: "default",
    name: "Default",
    importance: AndroidImportance.HIGH,
  });
}

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

async function registerTokenToBackend(token: string) {
  await request<ApiEnvelope<ApiPushDevice>>(
    "/api/profile/push-devices/",
    "POST",
    { token, platform: "android" },
    { auth: true }
  );
}

async function syncCurrentToken() {
  const token = await messaging().getToken();
  if (!token) return;
  await registerTokenToBackend(token);
}

export async function startPushNotifications() {
  if (started) return;
  started = true;

  await ensurePushPermission();
  await ensureAndroidChannel();

  await syncCurrentToken();

  tokenRefreshUnsub = messaging().onTokenRefresh(async newToken => {
    try {
      if (newToken) await registerTokenToBackend(newToken);
    } catch {
      // silent fail
    }
  });

  onMessageUnsub = messaging().onMessage(async remoteMessage => {
    const title = remoteMessage.notification?.title ?? "Flovers";
    const body = remoteMessage.notification?.body ?? "";

    await notifee.displayNotification({
      title,
      body,
      android: { channelId: "default" },
    });
  });
}

export function stopPushNotifications() {
  if (tokenRefreshUnsub) {
    tokenRefreshUnsub();
    tokenRefreshUnsub = null;
  }
  if (onMessageUnsub) {
    onMessageUnsub();
    onMessageUnsub = null;
  }
  started = false;
}
