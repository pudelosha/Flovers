import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  /* ---------- LIST / LAYOUT ---------- */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 21,          // match Reminders / Plants
    paddingBottom: 24,
  },

  // Backdrop to dismiss menus (no zIndex/elevation so menus stay above)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  /* ---------- TASK TILES (match Plants layering so menu floats above) ---------- */
  cardWrap: {
    height: 100,
    borderRadius: 28,
    overflow: "visible",     // allow dropdown to escape
    position: "relative",
    marginBottom: 0,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Raised state to keep an open menu above siblings
  cardWrapRaised: {
    zIndex: 20,
    elevation: 20,
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
    paddingHorizontal: 14,
  },

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
  leftCaption: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontWeight: "800",
  },

  // Center column
  centerCol: { flex: 1, paddingHorizontal: 6 },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  location: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 },
  dueWhen: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  dueDateText: { color: "rgba(255,255,255,0.95)", fontWeight: "700", fontSize: 12 },

  // 🔴 Overdue styling (applied to both label & date)
  dueOverdue: {
    color: "#FF4B4B", // dark-ish red; tweak if you want
  },

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

  // MENU SHEET — identical behavior to Plants so it renders above the tile
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

  /* ---------- EMPTY STATE (blurry card, like Plants) ---------- */
  emptyWrap: {
    marginTop: 0, // match Plants: no extra padding, rely on listContent padding
  },
  emptyGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 160,
  },
  emptyTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  emptyBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  emptyInner: { padding: 16, alignItems: "center" },
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
});
