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
    minHeight: 90,
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
    alignItems: "flex-start",  // 👈 pin content to top, no centering jump
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Left column
  leftCol: {
    width: 64,
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
    fontSize: 17,
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

  // Right column (chevron)
  rightCol: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 8,
  },

  // Note animation container (outer)
  noteContainer: {
    overflow: "hidden", // ensures animated height clips contents cleanly
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

  // ===== SORT/FILTER SHEETS (simplified) =====
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
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
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
    gap: 10,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipSelected: {
    backgroundColor: "rgba(11,114,133,0.25)",
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 16,
  },
  promptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,
  },
  promptBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  promptDanger: {
    backgroundColor: "rgba(255,107,107,0.22)",
  },
});
