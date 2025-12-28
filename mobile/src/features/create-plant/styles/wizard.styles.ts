import { StyleSheet } from "react-native";

export const wiz = StyleSheet.create({
  /** page spacing */
  pageContent: { paddingHorizontal: 16, paddingTop: 21 },

  /** glass card – AuthCard-style: big radius + shadow; blur/tint/border are layered in component */
  cardWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },
  /** White tint + thin border layers (match Login/AuthCard) */
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1, // the ONLY visible border
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  cardInner: { padding: 16, zIndex: 3 },

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

  /** Search box (Step 1) – flat/borderless */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  input: { flex: 1, color: "#FFFFFF", fontWeight: "700" },
  suggestBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 64,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 30,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  suggestName: { color: "#FFFFFF", fontWeight: "800" },
  suggestLatin: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontStyle: "italic" },

  /** Popular / list row */
  rowItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  rowName: { color: "#FFFFFF", fontWeight: "800" },
  rowLatin: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontStyle: "italic", marginTop: 2 },
  tagRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },

  /** Footer buttons – flat, borderless */
  footerRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  nextBtnWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)",
    borderWidth: 0,
    position: "relative",
    overflow: "hidden",
  },
  btnGlare: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    pointerEvents: "none",
    zIndex: 1,
  },
  nextBtnText: { color: "#FFFFFF", fontWeight: "800" },

  /** 50:50 Prev/Next – flat, borderless */
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
    borderWidth: 0,              // ← remove frame
    alignItems: "center",
    justifyContent: "center",
  },
  splitBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)", // no border
  },
  splitBtnPrimary: {
    backgroundColor: "rgba(11,114,133,0.9)",   // no border
  },
  splitBtnText: { color: "#FFFFFF", fontWeight: "800" },

  /** Step 2 buttons – flat, borderless */
  buttonRowDual: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 12 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0, // ← remove frame
  },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.9)" },
  btnText: { color: "#FFFFFF", fontWeight: "800" },

  /** Step 2 visuals */
  hero: { width: "100%", height: 180, borderRadius: 14, marginTop: 8, marginBottom: 10 },
  desc: { color: "rgba(255,255,255,0.95)", fontSize: 13, fontWeight: "300", lineHeight: 18, textAlign: "justify" },
  prefsGrid: { marginTop: 8, gap: 8 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefLabel: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "700", flex: 1 },
  prefValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  /** Step 3 */
  actionFull: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,  // flat
  },
  actionText: { color: "#FFFFFF", fontWeight: "800" },
  smallMuted: { color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 6, marginBottom: 8 },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  locationName: { color: "#FFFFFF", fontWeight: "800" },
  locationCat: { color: "#FFFFFF", fontWeight: "800", marginBottom: 6 },

  /** Modal wrapper */
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

  /** Inputs / segments — FLAT & 64-high input */
  inputField: {
    height: 64,
    marginHorizontal: 0,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 0, // flat input
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
    fontWeight: "700",
  },
  segmentRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  segBtn: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0, // ← remove frame
    alignItems: "center",
    justifyContent: "center",
  },
  segActive: { backgroundColor: "rgba(11,114,133,0.9)" },
  segText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  /** Horizontal “chip” scrollers (unchanged) */
  hScroll: { paddingVertical: 2 },
  hItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 8,
  },
  hItemActive: { backgroundColor: "rgba(11,114,133,0.9)" },
  hItemText: { color: "#FFFFFF", fontWeight: "800" },

  /** Chips (grid) — QUICK SUGGESTIONS MUST BE BORDERLESS */
  chipsWrap: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,        // ← remove frame
  },
  chipText: { color: "#FFFFFF", fontWeight: "800" },

  /** Select (flat) */
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0,        // ← remove frame
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 6,
  },
  selectValue: { color: "#FFFFFF", fontWeight: "800" },
  selectChevronPad: { paddingLeft: 10 },

  /** Inline dropdown list (flat) */
  dropdownList: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0,        // ← remove frame
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  dropdownListScroll: { maxHeight: 280 },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },
  dropdownItemDesc: { color: "rgba(255,255,255,0.92)", fontWeight: "600", marginTop: 2, lineHeight: 17 },
});
