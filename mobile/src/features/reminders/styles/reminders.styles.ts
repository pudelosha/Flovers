import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  // LIST / LAYOUT
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Backdrop to dismiss menus (no zIndex/elevation so menus stay above)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // TILES
  cardWrap: {
    height: 100,
    borderRadius: 18,
    overflow: "visible",
    position: "relative",
    marginBottom: 0,
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cardRow: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },

  // Left column
  leftCol: { width: 64, alignItems: "center", justifyContent: "center" },
  leftIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  leftCaption: { fontSize: 9, letterSpacing: 0.7, fontWeight: "800" },

  // Center column
  centerCol: { flex: 1, paddingHorizontal: 6 },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  location: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginTop: 2 },

  // Right column
  rightCol: { width: 56, alignItems: "flex-end", justifyContent: "center" },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  // Floating menu
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 20,
    elevation: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },
  menuItemText: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.2, fontSize: 12 },

  // Calendar placeholder
  calendarWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  placeholderText: { color: "#FFFFFF", fontWeight: "800" },
  placeholderHint: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: "600" },

  // PROMPT / MODALS (Plants-style)
  promptBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 20,
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    paddingHorizontal: 24,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // FORM controls
  inputLabel: {
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 16,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    letterSpacing: 0.2,
    fontSize: 12,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  // Same look as input, but no extra margins (for inline row)
  inputInline: {
    marginHorizontal: 0,
    marginBottom: 0,
  },

  dropdown: { marginHorizontal: 16, marginBottom: 10 },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownValue: { color: "#FFFFFF", fontWeight: "800" },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },

  // Inline row that spans full width (same side margins as inputs)
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  // Each half is 50% width with an 8px gutter
  inlineHalfLeft: { flex: 1, marginRight: 8 },
  inlineHalfRight: { flex: 1, marginLeft: 8 },

  // Modal buttons
  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  promptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: { backgroundColor: "rgba(11,114,133,0.9)", borderColor: "rgba(255,255,255,0.25)" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },

  // Danger variant (used by delete confirm)
  promptDanger: {
    backgroundColor: "rgba(255,107,107,0.2)",
    borderColor: "rgba(255,107,107,0.45)",
  },
  confirmText: { color: "rgba(255,255,255,0.95)", paddingHorizontal: 16, marginBottom: 10 },
});
