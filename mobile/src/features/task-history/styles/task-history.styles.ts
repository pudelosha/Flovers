import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  // LIST / LAYOUT
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 21,
    paddingBottom: 24,
  },

  // Backdrop if you later add menus/modals
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // ===== HISTORY TILES (glass, similar to Reminders) =====
  cardWrap: {
    borderRadius: 28,          // match Reminders glass cards
    overflow: "visible",
    position: "relative",
    marginBottom: 0,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    minHeight: 72,
  },
  // raised state when menu is open (so it floats above neighbours)
  cardWrapRaised: {
    zIndex: 50,
    elevation: 50,
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    zIndex: 2,
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",  // pin content to top, no centering jump
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // Left column
  leftCol: {
    width: 75,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  leftIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  leftCaption: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontWeight: "800",
  },

  // Center
  centerCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  plantName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  location: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  metaCompact: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.9,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  // Right column (menu button)
  rightCol: {
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    marginTop: 10, // small nudge down to align visually with content
  },

  // Floating menu (same idea as Reminders)
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 60,
    elevation: 60,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  menuItemText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    fontSize: 12,
  },

  // Note animation container (outer)
  noteContainer: {
    overflow: "hidden", // ensures animated height clips contents cleanly
    marginTop: 6,       // fixed margin so expansion doesn't shift other controls
  },

  // Note area (inner content)
  noteBox: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  noteLabel: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
    fontSize: 11,
    marginBottom: 4,
  },
  noteText: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 17,
  },

  // (legacy) simple history card styles kept for compatibility if needed
  line: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 4,
  },
  tag: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "700",
    fontSize: 11,
    marginTop: 4,
  },

  // EMPTY STATE
  emptyWrap: {
    marginTop: 0,
  },
  emptyInner: {
    padding: 16,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescBox: {
    alignSelf: "stretch",
    marginTop: 20,
  },
  emptyText: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
    lineHeight: 18,
  },
  inlineBold: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* ---------- MODALS / FORMS (match Home) ---------- */
  // bumped zIndex so modal always sits above tiles/FAB
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

  // FLAT INPUTS
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 0,
  },
  inputInline: { marginHorizontal: 0, marginBottom: 0 },

  // DROPDOWNS
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

  // flat variants for sort/delete dropdowns
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

  // 50/50 ROWS (if ever needed)
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  inlineHalfLeft: { flex: 1, minWidth: 0 },
  inlineHalfRight: { flex: 1, minWidth: 0 },

  // MODAL BUTTON ROW
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
  promptPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: { backgroundColor: "rgba(255,107,107,0.22)" },

  // SORT/FILTER EXTRAS
  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
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

  // CHIPS
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

  // rounded variants for “pill” modals (like Home sort)
  promptGlass28: {
    borderRadius: 28,
  },
  promptInner28: {
    borderRadius: 28,
  },
});
