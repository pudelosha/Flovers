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
  cardWrap: {
    minHeight: 140,
    borderRadius: 28,
    position: "relative",
    overflow: "visible",
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
  cardInner: { padding: 18 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { color: "rgba(255,255,255,0.9)", fontWeight: "700" },
  rowValue: { color: "#FFFFFF", fontWeight: "800" },
});

/** Controls: buttons, dropdowns, stepper/slider, sections, about */
export const controls = StyleSheet.create({
  // full-width action buttons — flat like dropdowns (no shadow/elevation), no borders
  actionBtnFull: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  actionBtnFullText: { fontWeight: "800" },
  actionPrimary: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  secondaryFull: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dangerFull: {
    backgroundColor: "rgba(255,107,107,0.16)",
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
    backgroundColor: "rgba(255,255,255,0.18)",
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  stepTime: { minWidth: 64, textAlign: "center", color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  // dropdowns (already flat/borderless)
  dropdown: { marginBottom: 10 },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dropdownValue: { color: "#FFFFFF", fontWeight: "800" },
  dropdownList: {
    marginTop: 6,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
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

  // slider
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sliderValue: { color: "#FFFFFF", fontWeight: "800", width: 52, textAlign: "right" },

  // save button — flat, no shadow/elevation, no inner glare
  saveBtn: {
    marginTop: 12,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(11,114,133,0.92)",
    justifyContent: "center",
    overflow: "hidden",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "800" },

  // about box
  aboutBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    gap: 4,
  },
  aboutTitle: { color: "#FFFFFF", fontWeight: "800", marginBottom: 4 },
  aboutLine: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },
  aboutStrong: { color: "#FFFFFF", fontWeight: "800" },
});

/** Prompt / modal styles */
export const prompts = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 20 },
  promptWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 21, paddingHorizontal: 24 },
  promptGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 28, overflow: "hidden" },
  promptInner: { width: "100%", maxWidth: 520, borderRadius: 28, overflow: "hidden", position: "relative" },
  promptTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 12, paddingHorizontal: 16, paddingTop: 16 },
  input: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  promptButtonsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 },
  promptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: { backgroundColor: "rgba(255,107,107,0.22)" },
  promptDangerText: { color: "#FF6B6B", fontWeight: "800" },
  warningText: { color: "rgba(255,255,255,0.95)", paddingHorizontal: 16, marginBottom: 10 },
});
