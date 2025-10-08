import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { useNavigation } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";

const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

type ReminderType = "watering" | "moisture" | "fertilising" | "care";

export default function AddReminderScreen() {
  const nav = useNavigation();

  const types: { key: ReminderType; label: string; icon: string }[] = useMemo(
    () => [
      { key: "watering", label: "Watering", icon: "water" },
      { key: "moisture", label: "Moisture", icon: "water-percent" },
      { key: "fertilising", label: "Fertilising", icon: "leaf" },
      { key: "care", label: "Care", icon: "flower" },
    ],
    []
  );

  // local form state (stub — wire to backend later)
  const [rType, setRType] = useState<ReminderType>("watering");
  const [plantName, setPlantName] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");   // e.g. 2025-10-08
  const [dueTime, setDueTime] = useState<string>("");   // e.g. 09:00
  const [notes, setNotes] = useState<string>("");

  const onSave = () => {
    // TODO: validate & submit
    // For now just close page
    nav.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Add reminder"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <View style={styles.content}>
        {/* Glass card */}
        <View style={styles.cardWrap}>
          <View style={styles.cardGlass}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]}
            />
          </View>

          <View style={styles.cardInner}>
            <Text style={styles.title}>Details</Text>

            {/* Reminder type */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {types.map((t) => {
                const active = rType === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[styles.typePill, active && styles.typePillActive]}
                    onPress={() => setRType(t.key)}
                    android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: false }}
                  >
                    <MaterialCommunityIcons
                      name={t.icon}
                      size={16}
                      color={active ? "#0B7285" : "#FFFFFF"}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Plant */}
            <Text style={styles.label}>Plant</Text>
            <TextInput
              value={plantName}
              onChangeText={setPlantName}
              placeholder="Choose plant (search or pick)…"
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={styles.input}
            />

            {/* Date & time (simple text inputs for now; swap for pickers later) */}
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder={Platform.OS === "ios" ? "YYYY-MM-DD" : "YYYY-MM-DD"}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  value={dueTime}
                  onChangeText={setDueTime}
                  placeholder="HH:mm"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes…"
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={[styles.input, { height: 100, textAlignVertical: "top", paddingTop: 10 }]}
              multiline
            />

            {/* Actions */}
            <Pressable style={styles.saveBtn} onPress={onSave}>
              <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom spacer so last control isn’t hidden behind tab bar */}
        <View style={{ height: 100 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  cardWrap: {
    borderRadius: 18,
    position: "relative",
    overflow: "visible",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardInner: {
    padding: 16,
  },

  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 },

  label: { color: "#FFFFFF", fontWeight: "800", marginBottom: 6, marginTop: 10 },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  typePillActive: {
    backgroundColor: "rgba(11,114,133,0.2)",
    borderColor: "rgba(11,114,133,0.45)",
  },
  typeText: { color: "#FFFFFF", fontWeight: "800" },
  typeTextActive: { color: "#0B7285" },

  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  row2: { flexDirection: "row", alignItems: "flex-start" },

  saveBtn: {
    marginTop: 14,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(11,114,133,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "800" },
});
