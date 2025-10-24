import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24 },

  // Big glass frame (like your cards) holding segmented, chart, and pills
  frameWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    minHeight: 340,
  },
  frameGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 28, overflow: "hidden" },
  frameTint:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.20)" },
  frameBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },

  // inner layout
  inner: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },

  // Segmented control
  segRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  segBtnActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  segText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, letterSpacing: 0.3 },

  // Chart
  chartBox: {
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
  },
  chartArea: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  yGuides: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
  },
  guideLine: {
    position: "absolute",
    left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
  },
  xRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  xLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 10 },

  // Pills row
  pillsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  pillActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  pillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
});
