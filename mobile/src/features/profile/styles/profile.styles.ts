import { StyleSheet } from "react-native";

/** Header + submenu */
export const header = StyleSheet.create({
  headerBar: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.7)" },

  subRow: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  subColLeft: { flex: 1, alignItems: "flex-start" },
  subColCenter: { flex: 1, alignItems: "center" },
  subColRight: { flex: 1, alignItems: "flex-end" },
  subBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  subBtnInner: { flexDirection: "row", alignItems: "center" },
  subBtnText: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.2, textTransform: "lowercase" },
  subIcon: { marginLeft: 6 },
  subActive: { textDecorationLine: "underline" },
});

/** Page layout paddings */
export const layout = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 80, gap: 16 },
});


/** Glass card, rows, titles */
export const card = StyleSheet.create({
  cardWrap: { minHeight: 140, borderRadius: 18, position: "relative" },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardInner: { padding: 16 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  rowValue: { color: "#FFFFFF", fontWeight: "800" },
});

/** Controls: buttons, dropdowns, stepper/slider, sections, about */
export const controls = StyleSheet.create({
  // full-width action buttons
  actionBtnFull: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  actionBtnFullText: { fontWeight: "800" },
  actionPrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  secondaryFull: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  dangerFull: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderColor: "rgba(255,107,107,0.35)",
  },

  // sections
  sectionTitleFirst: { marginTop: 0 },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: 8,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 10,
  },

  // toggles
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  toggleIcon: { marginTop: 2 },
  toggleLabel: { color: "#FFFFFF", fontWeight: "800" },
  toggleHint: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },

  // stepper
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  stepperLabel: { color: "#FFFFFF", fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  stepTime: { minWidth: 64, textAlign: "center", color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // dropdowns
  dropdown: { marginBottom: 10 },
  dropdownHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownValue: { color: "#FFFFFF", fontWeight: "800" },
  dropdownList: {
    marginTop: 6, borderRadius: 12, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.12)",
  },
  dropdownItem: {
    paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },

  // slider
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sliderValue: { color: "#FFFFFF", fontWeight: "800", width: 52, textAlign: "right" },

  // save button
  saveBtn: {
    marginTop: 12, alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "800" },

  // about box
  aboutBox: {
    marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.12)", gap: 4,
  },
  aboutTitle: { color: "#FFFFFF", fontWeight: "800", marginBottom: 4 },
  aboutLine: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },
  aboutStrong: { color: "#FFFFFF", fontWeight: "800" },
});

/** Prompt / modal styles */
export const prompts = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 20 },
  promptWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 21, paddingHorizontal: 24 },
  promptGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: "hidden" },
  promptInner: { width: "100%", maxWidth: 520, borderRadius: 18, overflow: "hidden", position: "relative" },
  promptTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 12, paddingHorizontal: 16, paddingTop: 16 },
  input: {
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promptButtonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 },
  promptBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: { backgroundColor: "rgba(11,114,133,0.9)", borderColor: "rgba(255,255,255,0.25)" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: { backgroundColor: "rgba(255,107,107,0.2)", borderColor: "rgba(255,107,107,0.45)" },
  promptDangerText: { color: "#FF6B6B", fontWeight: "800" },
  warningText: { color: "rgba(255,255,255,0.95)", paddingHorizontal: 16, marginBottom: 10 },
});
