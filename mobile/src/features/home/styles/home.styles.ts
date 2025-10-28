import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  /* ---------- LIST / LAYOUT ---------- */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 21,          // match Reminders
    paddingBottom: 24,
  },

  // Backdrop to dismiss menus (no zIndex/elevation so menus stay above)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  /* ---------- TASK TILES (match Reminders) ---------- */
  cardWrap: {
    height: 100,
    borderRadius: 28,
    overflow: "visible",     // allow floating menu to escape the tile
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

  // Floating menu — ensure it floats above blur layers and neighboring rows
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 30,             // higher than any tile/backdrop
    elevation: 30,
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
});
