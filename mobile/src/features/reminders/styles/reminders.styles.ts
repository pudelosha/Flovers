import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  // LIST / LAYOUT
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 21,
    paddingBottom: 24,
  },

  // Backdrop to dismiss menus (no zIndex/elevation so menus stay above)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  // ===== TILES (full-size) =====
  cardWrap: {
    height: 100,
    borderRadius: 28,                // match AuthCard/GlassCard
    overflow: "visible",
    position: "relative",
    marginBottom: 0,
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
  // NEW: white tint + thin border (single frame, like AuthCard)
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

  // Center
  centerCol: { flex: 1, paddingHorizontal: 6 },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  location: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginTop: 2 },

  // Right column (menu)
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

  // ===== CALENDAR =====
  calendarWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 21 },
  calendarScrollContent: { paddingBottom: 24 },
  calendarCard: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 80,
    padding: 12,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  calendarGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  calendarTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  calendarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    zIndex: 2,
  },
  calendarCore: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
  },

  // Header (Month + Year centered)
  calHeaderRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  calHeaderTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },

  // Legend — one row via horizontal ScrollView
  calendarLegendHScroll: { marginTop: 8 },
  calendarLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 12,
    paddingHorizontal: 2,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendLabelSmall: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 11 },

  // Subheading + empty state
  calendarSubheading: {
    marginTop: 40,
    marginBottom: 0,
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  calendarNoItems: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 6 },

  // Inside-frame list
  calendarListBox: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 460,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // ===== MINI TILES (calendar view) =====
  miniCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  miniIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 10,
  },
  miniContent: { flex: 1 },
  miniTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  miniSub: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontSize: 12, marginTop: 2 },
  miniTag: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 11, marginTop: 4 },
  miniActions: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  miniActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  // ===== PLACEHOLDERS =====
  placeholderText: { color: "#FFFFFF", fontWeight: "800" },
  placeholderHint: { color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: "600" },

  // ===== MODALS / FORMS =====
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
  promptGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: "hidden" },
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
  inputInline: { marginHorizontal: 0, marginBottom: 0 },

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

  inlineRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10 },
  inlineHalfLeft: { flex: 1, marginRight: 8 },
  inlineHalfRight: { flex: 1, marginLeft: 8 },

  // Modal buttons (primary/secondary/danger)
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
  promptDanger: {
    backgroundColor: "rgba(255,107,107,0.2)",
    borderColor: "rgba(255,107,107,0.45)",
  },
  confirmText: { color: "rgba(255,255,255,0.95)", paddingHorizontal: 16, marginBottom: 10 },

  // ===== ADDED: SORT/FILTER UI =====
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  chipSelected: {
    backgroundColor: "rgba(11,114,133,0.25)",
    borderColor: "rgba(11,114,133,0.65)",
  },
  chipText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },

  /* ---------- EMPTY STATE (glassy card, same margins as tiles) ---------- */
  emptyWrap: {
    marginTop: 5,
  },
  emptyGlass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
    minHeight: 140,
  },
  emptyInner: { padding: 16, alignItems: "center" },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  emptyDescBox: { alignSelf: "stretch", marginTop: 20 },
  emptyText: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
    lineHeight: 18,
  },
  inlineBold: { color: "#FFFFFF", fontWeight: "800" },
});
