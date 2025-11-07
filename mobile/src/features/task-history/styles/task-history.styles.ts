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

  // Simple history card
  cardWrap: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  line: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontSize: 12, marginTop: 4 },
  tag: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 11, marginTop: 4 },

  // EMPTY STATE (same pattern as Reminders / Readings)
  emptyWrap: {
    marginTop: 0,
  },
  emptyInner: { padding: 16, alignItems: "center" },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescBox: { alignSelf: "stretch", marginTop: 20 },
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
