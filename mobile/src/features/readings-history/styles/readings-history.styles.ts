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
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.20)",
    zIndex: 2,
  },

  inner: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },

  // Segmented control (merged)
  segRow: {
    flexDirection: "row",
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.13)",
    overflow: "hidden",
  },
  segBtn: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
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
  valueLabelSlot: {
    position: "absolute",
    left: "50%",
    width: 80,
    transform: [{ translateX: -40 }, { translateY: -6 }],
    alignItems: "center",
    zIndex: 10,
  },
  valueLabelBubble: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    minWidth: 22,
    alignItems: "center",
    justifyContent: "center",
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
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.45,
  },
  pillActive: { opacity: 1 },
  pillIcon: { marginBottom: 2 },
  pillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 8 },

  /* ---------- MODALS / FORMS ---------- */
  promptBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 80,
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 81,
    paddingHorizontal: 24,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  promptGlass28: {
    borderRadius: 28,
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  promptInner28: {
    borderRadius: 28,
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  promptDescription: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputLabel: {
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 16,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    letterSpacing: 0.2,
    fontSize: 12,
  },
  dropdown: { marginHorizontal: 16, marginBottom: 10 },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,
  },
  dropdownValue: { color: "#FFFFFF", fontWeight: "800" },
  dropdownList: {
    marginTop: 6,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 0,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },
  flatDropdownHeader: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  flatDropdownList: {
    borderWidth: 0,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  flatDropdownItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  promptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: { backgroundColor: "rgba(255,107,107,0.22)" },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  modalOptionText: {
    flex: 1,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  chipSelected: {
    backgroundColor: "rgba(11,114,133,0.25)",
  },
  chipText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});
