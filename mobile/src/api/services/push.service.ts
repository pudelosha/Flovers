import { Platform, PermissionsAndroid, Linking } from "react-native";
import messaging, { AuthorizationStatus } from "@react-native-firebase/messaging";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import { request, requestWithAccessToken } from "../client";
import { navTo, clearPendingNavigation } from "../../app/navigation/navigationRef";

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
let startInFlight: Promise<void> | null = null;
let lifecycleGeneration = 0;
let currentPushToken: string | null = null;
let revocationInFlight: Promise<void> | null = null;
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
 * - Known server route names are converted to custom links for background taps.
 */
function notificationUrl(data: Record<string, string>) {
  if (data.url) return data.url;
  const paths: Record<string, string> = {
    Home: "home", Readings: "readings", Plants: "plants", Reminders: "reminders", Profile: "profile",
  };
  return paths[data.route] ? `flovers://${paths[data.route]}` : undefined;
}

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS) return;

  const data = (detail.notification?.data || {}) as Record<string, string>;
  const url = notificationUrl(data);

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
  if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }

  const authStatus = await messaging().requestPermission();
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function registerTokenToBackend(token: string) {
  await request<ApiEnvelope<ApiPushDevice>>(
    "/profile/push-devices/",
    "POST",
    { token, platform: Platform.OS === "ios" ? "ios" : "android" },
    { auth: true }
  );
}

async function syncCurrentToken(isCurrent: () => boolean) {
  const token = await messaging().getToken();
  if (!token || !isCurrent()) return;
  currentPushToken = token;
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

export function startPushNotifications(): Promise<void> {
  if (started) return Promise.resolve();
  if (startInFlight) return startInFlight;
  const generation = lifecycleGeneration;
  const isCurrent = () => generation === lifecycleGeneration;
  const task = (async () => {
  await revocationInFlight;
  if (!isCurrent()) return;
  const allowed = await ensurePushPermission();
  if (!allowed || !isCurrent()) return;
  await ensureAndroidChannel();
  if (!isCurrent()) return;
  await syncCurrentToken(isCurrent);
  if (!isCurrent()) return;

  // A) launched by tapping a notification (killed -> opened)
  const initial = await messaging().getInitialNotification();
  if (!isCurrent()) return;
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
    if (!isCurrent()) return;
    const title = remoteMessage.notification?.title ?? "Flovers";
    const body = remoteMessage.notification?.body ?? "";
    const data = (remoteMessage.data || {}) as Record<string, string>;

    await notifee.displayNotification({
      title,
      body,
      data, // IMPORTANT: preserve routing data
      android: { channelId: "default", pressAction: { id: "default" } },
    });
  });

  tokenRefreshUnsub = messaging().onTokenRefresh(async newToken => {
    try {
      if (newToken && isCurrent()) {
        currentPushToken = newToken;
        await registerTokenToBackend(newToken);
      }
    } catch {
      // silent fail
    }
  });
  started = true;
  })();
  const pending = task.catch(error => {
    if (isCurrent()) stopPushNotifications();
    throw error;
  }).finally(() => {
    if (startInFlight === pending) startInFlight = null;
  });
  startInFlight = pending;
  return pending;
}

export function stopPushNotifications() {
  clearPendingNavigation();
  lifecycleGeneration += 1;
  startInFlight = null;
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

async function beforeDeadline<T>(operation: () => Promise<T>, deadline: number): Promise<T | undefined> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<undefined>(resolve => { timer = setTimeout(resolve, remaining); }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Best-effort teardown uses only the old access snapshot and has a fixed deadline. */
export function unregisterPushNotifications(accessToken: string | null): Promise<void> {
  stopPushNotifications();
  const previousToken = currentPushToken;
  currentPushToken = null;
  const previous = revocationInFlight;
  const deadline = Date.now() + 5000;
  const task = (async () => {
    await beforeDeadline(() => previous ?? Promise.resolve(), deadline);
    let token = previousToken;
    if (!token) {
      token = await beforeDeadline(() => messaging().getToken(), deadline) ?? null;
    }
    // Start both while the old token is known; offline HTTP must not delay local revocation.
    const deregistering = token && accessToken
      ? beforeDeadline(() => requestWithAccessToken(
        "/profile/push-devices/", "DELETE", { token }, accessToken, Math.max(1, deadline - Date.now())
      ), deadline)
      : Promise.resolve();
    await Promise.all([
      deregistering,
      beforeDeadline(() => messaging().deleteToken(), deadline),
    ]);
  })();
  const pending = task.finally(() => {
    if (revocationInFlight === pending) revocationInFlight = null;
  });
  revocationInFlight = pending;
  return pending;
}
