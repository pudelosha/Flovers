import React, { useRef, useState, useEffect } from "react";
import { View, ScrollView, Text, Animated, Easing } from "react-native";
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

import PreviousNextBar from "../components/PreviousNextBar";
import AddLocationModal from "../components/modals/AddLocationModal";
import type { LocationCategory } from "../types/create-plant.types";

/** Order used to infer direction for step transition animations */
const STEPS_ORDER = [
  "selectPlant",
  "traits",
  "location",
  "exposure",
  "potType",
  "autoTasks",
  "photo",
  "name",
  "creating",
] as const;

type StepKey = typeof STEPS_ORDER[number];

/** Resets the wizard state every time the screen gains focus. */
function ResetOnFocus() {
  const { actions } = useCreatePlantWizard();
  const scrollRef = useRef<ScrollView | null>(null); // noop here

  useFocusEffect(
    React.useCallback(() => {
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
      setFreshOpen(true);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return () => {};
    }, [])
  );

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  // ---------- LOCATION MODAL STATE (shared with Step 3) ----------
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const locationCreateHandlerRef = useRef<
    ((name: string, category: LocationCategory) => void) | null
  >(null);

  const registerLocationCreateHandler = React.useCallback(
    (fn: (name: string, category: LocationCategory) => void) => {
      locationCreateHandlerRef.current = fn;
    },
    []
  );

  const handleLocationCreate = (name: string, category: LocationCategory) => {
    locationCreateHandlerRef.current?.(name, category);
    setLocationModalOpen(false);
  };

  // Close modal automatically if user leaves Step 3
  useEffect(() => {
    if (state.step !== "location") {
      setLocationModalOpen(false);
    }
  }, [state.step]);

  // ---------- ✨ STEP TRANSITION ANIMATION ----------
  const entry = useRef(new Animated.Value(1)).current;
  const prevStepRef = useRef<StepKey>("selectPlant");
  const dirRef = useRef<1 | -1>(1);

  const stepKey = state.step as StepKey;
  useEffect(() => {
    const prevKey = prevStepRef.current;
    const steps = STEPS_ORDER;
    const prevIdx = steps.indexOf(prevKey);
    const nextIdx = steps.indexOf(stepKey);
    if (prevIdx !== -1 && nextIdx !== -1) {
      dirRef.current = nextIdx > prevIdx ? 1 : -1;
    } else {
      dirRef.current = 1;
    }

    entry.setValue(0);
    Animated.timing(entry, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    prevStepRef.current = stepKey;
  }, [stepKey, entry]);

  const translateX = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [24 * dirRef.current, 0],
  });
  const opacity = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const scale = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  // ---- Extra space beneath content so the floating bar doesn't overlap the card
  const floatingBottomOffset = 80; // keep consistent with the bar
  const extraBottomSpace = insets.bottom + floatingBottomOffset + 45;

  return (
    <>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[wiz.pageContent, { paddingBottom: extraBottomSpace }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Animated step container */}
        <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
          {state.step === "selectPlant" && (
            <Step01_SelectPlant
              onScrollToTop={scrollTop}
              freshOpen={freshOpen}
              onCleared={() => setFreshOpen(false)}
            />
          )}
          {state.step === "traits" && <Step02_PlantTraits />}
          {state.step === "location" && (
            <Step03_SelectLocation
              onScrollTop={scrollTop}
              onOpenAddLocation={() => setLocationModalOpen(true)}
              onRegisterCreateHandler={registerLocationCreateHandler}
            />
          )}

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
        </Animated.View>
      </ScrollView>

      {/* Floating Previous / Next — solid backgrounds, logic handled internally */}
      <PreviousNextBar
        bottomOffset={floatingBottomOffset}
        hidden={locationModalOpen && state.step === "location"}
      />

      {/* Location modal overlay (same pattern as Reminders / EditPlant modals) */}
      <AddLocationModal
        visible={locationModalOpen && state.step === "location"}
        onClose={() => setLocationModalOpen(false)}
        onCreate={handleLocationCreate}
      />
    </>
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
