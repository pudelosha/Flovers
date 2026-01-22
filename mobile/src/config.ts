import Config from "react-native-config";

function trimSlashEnd(v: string) {
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

// Base used for in-app API calls
export const API_BASE =
  (Config.API_BASE && Config.API_BASE.trim()) || "http://192.168.0.99:8000";

export const PUBLIC_BASE_URL =
  (Config.PUBLIC_BASE_URL && Config.PUBLIC_BASE_URL.trim()) || API_BASE;

// Normalized (no trailing slash) to prevent // in URLs
export const API_BASE_NORM = trimSlashEnd(API_BASE);
export const PUBLIC_BASE_URL_NORM = trimSlashEnd(PUBLIC_BASE_URL);

console.log("[config] API_BASE =", API_BASE_NORM);
console.log("[config] PUBLIC_BASE_URL =", PUBLIC_BASE_URL_NORM);
