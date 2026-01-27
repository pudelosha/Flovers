import { Platform, PermissionsAndroid, Linking } from "react-native";
import messaging, { AuthorizationStatus } from "@react-native-firebase/messaging";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import { request } from "../client";
import { navTo } from "../../app/navigation/navigationRef";

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
let onNotifOpenedUnsub: null | (() => void) = null;
let notifeeForegroundUnsub: null | (() => void) = null;

/**
 * Background handler (app in background/killed).
 * Must be registered at module scope.
 *
 * IMPORTANT:
 * - Prefer "url" for deep linking (works even when nav isn't ready).
 * - If "url" is missing, it will do nothing in killed state (by design).
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) return;

  const data = (detail.notification?.data || {}) as Record<string, string>;
  const url = data.url;

  if (url) {
    await Linking.openURL(url).catch(() => {});
  }
});

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
    { token, platform: Platform.OS === "ios" ? "ios" : "android" },
    { auth: true }
  );
}

async function syncCurrentToken() {
  const token = await messaging().getToken();
  if (!token) return;
  await registerTokenToBackend(token);
}

/** central handler: open notification -> navigate / deep link */
function handleOpenFromData(data?: Record<string, string>) {
  if (!data) {
    navTo("Home");
    return;
  }

  // Preferred: deep link URL
  const url = data.url;
  if (url) {
    Linking.openURL(url).catch(() => {});
    return;
  }

  // Optional: route + params (only reliable when app is already running)
  const route = data.route;
  if (route) {
    const params: any = {};
    if (data.plantId) params.plantId = data.plantId;
    if (data.id) params.id = data.id;
    navTo(route, params);
    return;
  }

  navTo("Home");
}

export async function startPushNotifications() {
  if (started) return;
  started = true;

  await ensurePushPermission();
  await ensureAndroidChannel();
  await syncCurrentToken();

  // A) launched by tapping a notification (killed -> opened)
  const initial = await messaging().getInitialNotification();
  if (initial) {
    handleOpenFromData(initial.data as any);
  }

  // B) tapped while app in background
  onNotifOpenedUnsub = messaging().onNotificationOpenedApp(remoteMessage => {
    handleOpenFromData(remoteMessage.data as any);
  });

  // C) tapped Notifee notification (foreground-generated)
  notifeeForegroundUnsub = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      const data = (detail.notification?.data || {}) as Record<string, string>;
      handleOpenFromData(data);
    }
  });

  // D) received while foreground -> display Notifee
  onMessageUnsub = messaging().onMessage(async remoteMessage => {
    const title = remoteMessage.notification?.title ?? "Flovers";
    const body = remoteMessage.notification?.body ?? "";
    const data = (remoteMessage.data || {}) as Record<string, string>;

    await notifee.displayNotification({
      title,
      body,
      data, // IMPORTANT: preserve routing data
      android: { channelId: "default" },
    });
  });

  tokenRefreshUnsub = messaging().onTokenRefresh(async newToken => {
    try {
      if (newToken) await registerTokenToBackend(newToken);
    } catch {
      // silent fail
    }
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
  if (onNotifOpenedUnsub) {
    onNotifOpenedUnsub();
    onNotifOpenedUnsub = null;
  }
  if (notifeeForegroundUnsub) {
    notifeeForegroundUnsub();
    notifeeForegroundUnsub = null;
  }
  started = false;
}
