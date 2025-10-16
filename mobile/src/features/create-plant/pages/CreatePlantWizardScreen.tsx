// screens/CreatePlantWizardScreen.tsx
import React, { useRef, useState } from "react";
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
import Step03_SelectLocation from "../steps/Step03_SelectLocation";
import Step04_Exposure from "../steps/Step04_Exposure";
import Step05_ContainerAndSoil from "../steps/Step05_ContainerAndSoil";
import Step06_AutoTasks from "../steps/Step06_AutoTasks";
import Step07_Photo from "../steps/Step07_Photo";
import Step08_NameAndNotes from "../steps/Step08_NameAndNotes";
import Step09_Creating from "../steps/Step09_Creating";

/** Resets the wizard state every time the screen gains focus. */
function ResetOnFocus() {
  const { actions } = useCreatePlantWizard();
  const scrollRef = useRef<ScrollView | null>(null); // only to satisfy TS in WizardBody; noop here

  useFocusEffect(
    React.useCallback(() => {
      // Hard reset to initial (step: "selectPlant", cleared createdPlantId, etc.)
      actions.reset();
      return () => {};
    }, [actions])
  );

  return null;
}

function WizardBody() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { state } = useCreatePlantWizard();

  // Marks that the wizard was just opened; Step 1 will clear once, then turn this off.
  const [freshOpen, setFreshOpen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // Fresh open every time we focus the screen
      setFreshOpen(true);
      // make sure we start at top
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return () => {};
    }, [])
  );

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[wiz.pageContent, { paddingBottom: insets.bottom + 120 }]}
      keyboardShouldPersistTaps="handled"
    >
      {state.step === "selectPlant" && (
        <Step01_SelectPlant
          onScrollToTop={scrollTop}
          freshOpen={freshOpen}
          onCleared={() => setFreshOpen(false)}
        />
      )}
      {state.step === "traits" && <Step02_PlantTraits />}
      {state.step === "location" && <Step03_SelectLocation onScrollTop={scrollTop} />}

      {state.step === "exposure" && <Step04_Exposure />}
      {state.step === "potType" && <Step05_ContainerAndSoil />}
      {state.step === "autoTasks" && <Step06_AutoTasks />}
      {state.step === "photo" && <Step07_Photo />}
      {state.step === "name" && <Step08_NameAndNotes />}
      {state.step === "creating" && <Step09_Creating />}

      {!(
        state.step === "selectPlant" ||
        state.step === "traits" ||
        state.step === "location" ||
        state.step === "exposure" ||
        state.step === "potType" ||
        state.step === "autoTasks" ||
        state.step === "photo" ||
        state.step === "name" ||
        state.step === "creating"
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
      {/* Reset state whenever this screen regains focus */}
      <ResetOnFocus />

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
