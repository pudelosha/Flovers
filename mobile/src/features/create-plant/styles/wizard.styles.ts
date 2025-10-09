// src/features/create-plant/styles/wizard.styles.ts
import { StyleSheet } from "react-native";

export const wiz = StyleSheet.create({
  /** page spacing (matches Profile top/bottom feel) */
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 21,
  },

  /** glass card */
  cardWrap: {
    borderRadius: 18,
    overflow: "visible",
    position: "relative",
    marginBottom: 18,
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardInner: {
    padding: 16,
  },

  /** headings */
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },
  subtitle: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 18,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
  },

  /** Search box (normalized height) */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8, // normalized
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  suggestBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 48,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 30,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  suggestName: { color: "#FFFFFF", fontWeight: "800" },
  suggestLatin: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontStyle: "italic" },

  /** Popular list – row (no tiles) */
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  rowName: { color: "#FFFFFF", fontWeight: "800" },
  rowLatin: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    fontStyle: "italic",
    marginTop: 2,
  },
  tagRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },

  /** Footer (Next under search, right-aligned, wide) */
  footerRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  nextBtnWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  nextBtnText: { color: "#FFFFFF", fontWeight: "800" },
});
