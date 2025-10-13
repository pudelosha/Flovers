import { StyleSheet } from "react-native";

export const wiz = StyleSheet.create({
  /** page spacing */
  pageContent: { paddingHorizontal: 16, paddingTop: 21 },

  /** glass card */
  cardWrap: { borderRadius: 18, overflow: "visible", position: "relative", marginBottom: 18 },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardInner: { padding: 16 },

  /** headings */
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 18,
  },
  sectionTitle: { color: "#FFFFFF", fontWeight: "800", marginTop: 10, marginBottom: 8 },

  /** Search box (Step 1) */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  input: { flex: 1, color: "#FFFFFF", fontWeight: "700" },
  suggestBox: {
    position: "absolute",
    left: 0, right: 0, top: 48,
    borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.85)", zIndex: 30,
  },
  suggestItem: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.25)",
  },
  suggestName: { color: "#FFFFFF", fontWeight: "800" },
  suggestLatin: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontStyle: "italic" },

  /** Popular / list row */
  rowItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  rowName: { color: "#FFFFFF", fontWeight: "800" },
  rowLatin: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontStyle: "italic", marginTop: 2 },
  tagRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },

  /** Footer buttons (Step 1) */
  footerRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  nextBtnWide: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  nextBtnText: { color: "#FFFFFF", fontWeight: "800" },

  /** 50:50 Prev/Next (full width) */
  footerRowSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    alignSelf: "stretch",
  },
  splitBtn: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splitBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  splitBtnPrimary: {
    backgroundColor: "rgba(11,114,133,0.9)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  splitBtnText: { color: "#FFFFFF", fontWeight: "800" },

  /** Step 2 */
  hero: { width: "100%", height: 180, borderRadius: 14, marginTop: 8, marginBottom: 10 },
  desc: { color: "rgba(255,255,255,0.95)", fontWeight: "600", lineHeight: 18 },
  buttonRowDual: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12 },
  btn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.9)" },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
  prefsGrid: { marginTop: 8, gap: 8 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefLabel: { color: "rgba(255,255,255,0.92)", fontWeight: "700", flex: 1 },
  prefValue: { color: "#FFFFFF", fontWeight: "800" },

  /** Step 3 */
  actionFull: {
    alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  actionText: { color: "#FFFFFF", fontWeight: "800" },
  smallMuted: { color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 6, marginBottom: 8 },

  locationRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.18)",
  },
  locationName: { color: "#FFFFFF", fontWeight: "800" },
  locationCat: { color: "#FFFFFF", fontWeight: "800", marginBottom: 6 },

  /** Modal wrapper (used elsewhere) */
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 20 },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "stretch",
    justifyContent: "flex-start",
    zIndex: 21,
    paddingHorizontal: 0,
  },
  promptGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 0, overflow: "hidden" },
  promptInnerFull: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  promptScroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  /** Inputs / segments */
  inputField: {
    marginHorizontal: 0, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  segmentRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  segBtn: {
    flex: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  segActive: { backgroundColor: "rgba(11,114,133,0.9)" },
  segText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  /** 🔵 NEW: horizontal “chip” scrollers (Step 4) */
  hScroll: { paddingVertical: 2 },
  hItem: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 8,
  },
  hItemActive: { backgroundColor: "rgba(11,114,133,0.9)" },
  hItemText: { color: "#FFFFFF", fontWeight: "800" },

  /** Chips (grid) */
  chipsWrap: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  chipText: { color: "#FFFFFF", fontWeight: "800" },

  /** 🔵 NEW: Select (Step 5) — header matches Profile dropdown look */
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 6, // tighter: list appears right below
  },
  selectValue: { color: "#FFFFFF", fontWeight: "800" },
  selectChevronPad: { paddingLeft: 10 },

  /** 🔵 NEW: Inline dropdown list (mirrors profile.controls.*) */
  dropdownList: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  dropdownListScroll: { maxHeight: 280 }, // prevent ultra-tall lists
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },
  dropdownItemDesc: { color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 2, lineHeight: 17 },
});
