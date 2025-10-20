import { StyleSheet } from "react-native";

export const scannerStyles = StyleSheet.create({
  infoWrap: { paddingHorizontal: 16, paddingTop: 16 },
  infoGlass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    minHeight: 100,
  },
  infoInner: { padding: 16 },
  infoTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  infoText: { color: "rgba(255,255,255,0.95)", fontWeight: "200", lineHeight: 18 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  exampleUrl: { color: "#FFFFFF", fontWeight: "800", flexShrink: 1 },
  infoHint: { color: "rgba(255,255,255,0.9)", fontWeight: "200", marginTop: 8 },

  camWrap: { paddingHorizontal: 16, paddingTop: 16 },
  camGlass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    minHeight: 320,
  },

  // IMPORTANT: no overflow/borderRadius here to avoid black preview on Android
  camInner: { flex: 1, position: "relative" },

  // Let Camera fill the space
  qrCamera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },

  // A visual rounded frame over the camera so it looks rounded without clipping
  roundedMask: {
    position: "absolute",
    top: 0, right: 0, bottom: 0, left: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    pointerEvents: "none",
  },

  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  placeholderText: { color: "#FFFFFF", fontWeight: "800" },
  placeholderHint: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 6 },

  // Overlay styles
  overlayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  overlayGlass: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    maxWidth: 520,
    width: "100%",
  },
  overlayInner: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 6,
    fontSize: 14,
  },
  overlayText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  overlayButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  overlayButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
