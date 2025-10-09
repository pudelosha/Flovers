import React, { useRef } from "react";
import { View, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/create-plant.constants";
import { wiz } from "../styles/wizard.styles";
import { CreatePlantProvider } from "../context/CreatePlantProvider";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

import Step01_SelectPlant from "../steps/Step01_SelectPlant";
import Step02_PlantTraits from "../steps/Step02_PlantTraits";

function WizardBody() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { state, actions } = useCreatePlantWizard();

  // Always start fresh when this screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      actions.reset();
      // scroll to top as we enter
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [actions])
  );

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[wiz.pageContent, { paddingBottom: insets.bottom + 120 }]}
      keyboardShouldPersistTaps="handled"
    >
      {state.step === "selectPlant" && <Step01_SelectPlant onScrollToTop={scrollTop} />}
      {state.step === "traits" && <Step02_PlantTraits />}

      {/* Temporary placeholders for next steps to keep navigation safe */}
      {state.step !== "selectPlant" && state.step !== "traits" && (
        <View style={wiz.cardWrap}>
          <View style={wiz.cardGlass} />
          <View style={wiz.cardInner}>
            <Text style={wiz.title}>Step “{state.step}”</Text>
            <Text style={wiz.subtitle}>This step will be implemented next.</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export default function CreatePlantWizardScreen() {
  return (
    <CreatePlantProvider>
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Create plant"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
        />
        <WizardBody />
      </View>
    </CreatePlantProvider>
  );
}
