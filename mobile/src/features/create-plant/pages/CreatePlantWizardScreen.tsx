import React, { useRef } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/create-plant.constants";
import { wiz } from "../styles/wizard.styles";
import { CreatePlantProvider } from "../context/CreatePlantProvider";
import Step01_SelectPlant from "../steps/Step01_SelectPlant";

export default function CreatePlantWizardScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  return (
    <CreatePlantProvider>
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Create plant"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
        />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            wiz.pageContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Step01_SelectPlant
            onScrollToTop={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        </ScrollView>
      </View>
    </CreatePlantProvider>
  );
}
