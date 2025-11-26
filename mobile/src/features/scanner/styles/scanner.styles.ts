import { StyleSheet } from "react-native";

export const scannerStyles = StyleSheet.create({
  // ===== Info card =====
  infoWrap: { paddingHorizontal: 16, paddingTop: 16 },
  infoGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 100,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  frostTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },

  infoInner: { padding: 16, zIndex: 3 },
  infoTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  infoText: { color: "rgba(255,255,255,0.95)", fontWeight: "200", lineHeight: 18 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  exampleUrl: { color: "#FFFFFF", fontWeight: "800", flexShrink: 1 },
  infoHint: { color: "rgba(255,255,255,0.9)", fontWeight: "200", marginTop: 8 },

  // ===== Camera frame =====
  camWrap: { paddingHorizontal: 16, paddingTop: 16 },
  camGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 200,     // lower bound; actual height comes from ScannerScreen
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  camInner: { flex: 1, position: "relative" },
  qrCamera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },

  roundedMask: {
    position: "absolute",
    top: 0, right: 0, bottom: 0, left: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.12)",
    pointerEvents: "none",
    zIndex: 3,
  },

  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  placeholderText: { color: "#FFFFFF", fontWeight: "800" },
  placeholderHint: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 6 },

  overlayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  overlayGlass: {
    borderRadius: 28,
    overflow: "hidden",
    maxWidth: 520,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  overlayBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  overlayInner: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    zIndex: 3,
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
