import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  // LIST / LAYOUT (match Plants)
  listContent: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24 },

  // ---------- TILE: glass recipe like Plants ----------
  cardWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    minHeight: 148,
  },
  cardGlass: { ...StyleSheet.absoluteFillObject, borderRadius: 28, overflow: "hidden" },
  cardTint:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.20)" },
  cardBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },

  // rows
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  name: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  dotsBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 5,
    gap: 10,
  },
  col: { flex: 1, alignItems: "center" },

  iconCircle: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  metricValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  lastRow: { paddingHorizontal: 25, paddingTop: 8, paddingBottom: 14 },
  lastText: { color: "rgba(255,255,255,0.88)", fontWeight: "600", fontSize: 10 },

  // menu sheet (match Plants)
  menuSheet: {
    position: "absolute",
    right: 6, top: 6, zIndex: 10, elevation: 10,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },
  menuItemText: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.2, fontSize: 12 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },

  /* ---------- EMPTY STATE (mirror Reminders look) ---------- */
  emptyWrap: {
    marginTop: 0,
    paddingHorizontal: 16,
    paddingTop: 21,
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
