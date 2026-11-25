import { StyleSheet } from "react-native";

// Two corner radii keep the camera's complete upper curve behind the instruction card.
export const SCANNER_CAMERA_OVERLAP = 56;

export const scannerStyles = StyleSheet.create({
  // ===== Info card =====
  infoWrap: { paddingHorizontal: 16, paddingTop: 16, zIndex: 2 },
  infoGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 100,

    // elevation only to avoid inner-rectangle artifacts
    elevation: 8,
  },
  frostTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
    zIndex: 1,
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 0, // thicker like Profile
    borderColor: "rgba(255,255,255,0.20)", // Profile-style border tone
    zIndex: 2,
  },

  infoInner: { padding: 16, zIndex: 3 },
  infoTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  infoText: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "300",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "justify",
  },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  exampleUrl: { color: "#FFFFFF", fontWeight: "800", flexShrink: 1 },
  infoHint: { color: "rgba(255,255,255,0.9)", fontWeight: "200", marginTop: 8 },

  guideRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  guideDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.14)", paddingTop: 10 },
  guideIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  guideCopy: { flex: 1, minWidth: 0 },
  guideTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 14, marginBottom: 3 },
  guidePath: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 16, marginTop: 4 },
  scanError: { color: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 12 },

  // ===== Camera frame =====
  camWrap: { paddingHorizontal: 16, marginTop: -SCANNER_CAMERA_OVERLAP, zIndex: 1 },
  camGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 200 + SCANNER_CAMERA_OVERLAP,

    // elevation only to avoid inner-rectangle artifacts
    elevation: 0,
  },

  camInner: { flex: 1, position: "relative", paddingTop: SCANNER_CAMERA_OVERLAP },
  qrCamera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },

  roundedMask: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 28,
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.20)",
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

    // elevation only to avoid inner-rectangle artifacts
    elevation: 8,
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
    zIndex: 1,
  },
  overlayBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 0, // thicker like Profile
    borderColor: "rgba(255,255,255,0.20)", // Profile-style border tone
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
