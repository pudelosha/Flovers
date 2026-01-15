import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24 },

  // Big glass frame (like your tiles) holding segmented, plant name, date nav, chart, pills
  frameWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",

    // Keep ONLY Android elevation (iOS shadow off to avoid inner-rect shade with overlays)
    elevation: 8,

    minHeight: 360,
  },
  frameGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 28, overflow: "hidden" },

  // Match AuthCard/PlantTile tint (lower opacity)
  frameTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.14)", zIndex: 1 },

  // Keep border on top
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    zIndex: 2,
  },

  inner: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },

  // Segmented control (borderless)
  segRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)", // no border
  },
  segBtnActive: { backgroundColor: "rgba(11,114,133,0.92)" },
  segText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },

  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17, marginBottom: 8 },

  // Date navigator row (◄ 20.10 - 26.10 ►)
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  dateBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dateText: { color: "rgba(255,255,255,0.92)", fontWeight: "800", fontSize: 14 },

  // Chart
  chartBox: {
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    // borderless look in the chart container too
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
  },
  chartArea: {
    // height is dynamic, set inline by parent using measured value
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    overflow: "visible",
  },
  yGuides: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  // Container for each bar + its label (tap area)
  barTapArea: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  valueLabelBubble: {
    position: "absolute",
    left: "50%",
    // vertical position comes from bottom: <pixels> in component
    transform: [{ translateX: -20 }, { translateY: -6 }],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  valueLabelText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10, // same as xLabel
    textAlign: "center",
  },
  xRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  xLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 10 },

  // Metric pills row (borderless)
  pillsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)", // no border
  },
  pillActive: { backgroundColor: "rgba(11,114,133,0.92)" },
  pillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
