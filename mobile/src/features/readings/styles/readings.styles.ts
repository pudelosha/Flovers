import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 24 },

  cardWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    minHeight: 148,
  },

  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },

  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
    zIndex: 1,
  },

  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    zIndex: 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
  },

  name: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },

  dotsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  metricValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  lastRow: { paddingHorizontal: 25, paddingTop: 8, paddingBottom: 14 },
  lastText: { color: "rgba(255,255,255,0.88)", fontWeight: "600", fontSize: 10 },

  menuSheet: {
    position: "absolute",
    right: 6,
    top: 6,
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

  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 2 },
  menuItemText: { color: "#FFFFFF", fontWeight: "700", letterSpacing: 0.2, fontSize: 12 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },

  emptyWrap: {
    marginTop: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },

  // Separator line for headers and sections (white for testing)
  separatorLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF", // White separator line for testing
    marginVertical: 12, // Adjust for better spacing
  },

  // Header for left-aligned text, ensuring consistency
  headerLeft: {
    color: "#FFFFFF",
    fontWeight: "700", // Aligning text to match other headers
    fontSize: 16,
    marginLeft: 16, // Ensures alignment with other elements
    marginBottom: 6, // Small space after the header
  },

  // Adding styles for sensors, notifications, and water pump headers
  headerText: {
    color: "#FFFFFF",
    fontWeight: "700",  // Same as other headers
    fontSize: 16,
    marginLeft: 16,  // Align all headers to the left
  },
});