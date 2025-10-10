import React, { useRef } from "react";
import { View, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/create-plant.constants";
import { wiz } from "../styles/wizard.styles";

// NOTE: keep this path matching your project (you showed context/CreatePlantProvider)
import { CreatePlantProvider } from "../context/CreatePlantProvider";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

import Step01_SelectPlant from "../steps/Step01_SelectPlant";
import Step02_PlantTraits from "../steps/Step02_PlantTraits";
import Step03_SelectLocation from "../steps/Step03_SelectLocation";
import Step04_Exposure from "../steps/Step04_Exposure";

function WizardBody() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { state, actions } = useCreatePlantWizard();

  useFocusEffect(
    React.useCallback(() => {
      // reset a new session whenever this screen is (re)focused
      actions.reset();
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
      {state.step === "location" && <Step03_SelectLocation onScrollTop={scrollTop} />}

      {/* Render the new Step 4 */}
      {state.step === "exposure" && <Step04_Exposure />}

      {/* Fallback for not-yet-implemented steps */}
      {!(
        state.step === "selectPlant" ||
        state.step === "traits" ||
        state.step === "location" ||
        state.step === "exposure"
      ) && (
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
