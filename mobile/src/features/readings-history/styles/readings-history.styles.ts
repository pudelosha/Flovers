import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24 },

  // Big glass frame (like your tiles) holding segmented, plant name, date nav, chart, pills
  frameWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    minHeight: 360,
  },
  frameGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 28, overflow: "hidden" },
  frameTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.20)" },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
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
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  valueLabelBubble: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  valueLabelText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10, // same as xLabel
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
