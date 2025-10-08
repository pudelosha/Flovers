import React from "react";
import { View, Text } from "react-native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/plants.constants";
import { s } from "../styles/plants.styles";

export default function AddPlantScreen() {
  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Add plant"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}   // no divider under the title
        // no right icon on this page
      />

      <View style={s.wizardPlaceholder}>
        <Text style={s.wizardTitle}>New plant setup</Text>
        <Text style={s.wizardText}>
          Multi-step flow coming soon. This is a placeholder page (not a modal).
        </Text>
      </View>
    </View>
  );
}
