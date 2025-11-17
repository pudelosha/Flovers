// src/features/locations/styles/locations.styles.ts
import { StyleSheet } from "react-native";

export const locStyles = StyleSheet.create({
  // LIST / LAYOUT – match PlantsScreen paddings
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 21,
    paddingBottom: 24,
  },

  // BACKDROP to dismiss tile menus
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // ---------- TILES ----------
  cardWrap: {
    minHeight: 72,
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
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
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },

  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  locationName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  plantCount: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },

  // MENU BUTTON + SHEET
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 10,
    elevation: 10,
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
  // 🔴 special style for Delete label
  menuItemDangerText: {
    color: "#FF6B6B",
    fontWeight: "800",
  },

  // ---------- MODAL / PROMPT ----------
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
    borderRadius: 28,
    overflow: "hidden",
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
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
  confirmText: {
    color: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  inputLabel: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.14)",
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
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  promptDanger: { backgroundColor: "rgba(255,107,107,0.22)" },

  // ---------- CATEGORY SEGMENT & CHIPS ----------
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  // base shape only
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // inactive: soft neutral background
  segInactive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  // active: strong blue highlight
  segActive: {
    backgroundColor: "rgba(11,114,133,0.92)",
    borderWidth: 1,
    borderColor: "rgba(11,114,133,1)",
  },
  segText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  locationCat: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    fontSize: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },

  // 2-column grid chips (2x4 when using 8 items)
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  chip: {
    flexBasis: "48%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },

  // ---------- EMPTY STATE ----------
  emptyWrap: {
    marginTop: 0,
  },
  emptyGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 140,
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
    textAlign: "center",
  },
  inlineBold: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
