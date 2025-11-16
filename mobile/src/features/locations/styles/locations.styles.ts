// src/features/locations/styles/locations.styles.ts
import { StyleSheet } from "react-native";

export const locStyles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  tileWrap: {
    borderRadius: 24,
    overflow: "hidden",
  },
  tileGlass: {
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 72,
  },
  tileInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  tileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  locationName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  plantCount: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 13,
  },

  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyGlass: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 140,
  },
  emptyInner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptyDescBox: {
    borderRadius: 18,
    padding: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  inlineBold: {
    fontWeight: "700",
  },
});
