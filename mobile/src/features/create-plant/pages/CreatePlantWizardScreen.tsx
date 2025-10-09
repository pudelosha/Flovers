// src/features/create-plant/pages/CreatePlantWizardScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import GlassHeader from "../../../shared/ui/GlassHeader";

export default function CreatePlantWizardScreen() {
  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Create plant"
        gradientColors={["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"]}
        solidFallback="rgba(10,51,40,0.70)"
        showSeparator={false}
      />

      <View style={styles.placeholder}>
        <Text style={styles.title}>New plant setup</Text>
        <Text style={styles.text}>
          Multi-step flow coming soon. This is a placeholder page (not a modal).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 8,
  },
  text: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
});
