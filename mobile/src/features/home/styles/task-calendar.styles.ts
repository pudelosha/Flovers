import {StyleSheet} from "react-native";
export const s=StyleSheet.create({
  calendarCard: {
    position: "relative",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
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
    backgroundColor: "rgba(255,255,255,0.14)",
    zIndex: 1,
  },
  calendarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 0,
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

});
