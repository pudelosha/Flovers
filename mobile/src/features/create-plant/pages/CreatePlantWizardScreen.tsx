// screens/CreatePlantWizardScreen.tsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, ScrollView, Text, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
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
import ResetWizardOnFocus from "../components/ResetWizardOnFocus";
import AddLocationModal from "../components/modals/AddLocationModal";
import MeasureExposureModal from "../components/modals/MeasureExposureModal";
import PlantScannerModal from "../components/modals/PlantScannerModal";
import type { LocationCategory, Suggestion } from "../types/create-plant.types";

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
const ASYNC_STEPS: readonly string[] = ["selectPlant", "traits", "location", "photo", "creating"];

function WizardBody() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { state, actions } = useCreatePlantWizard();
  const [photoInteracting, setPhotoInteracting] = useState(false);
  const stepKey = state.step as StepKey;
  const selectedPlant = state.selectedPlant;
  const stepContext = `${stepKey}:${currentLanguage}:${stepKey === "traits" ? selectedPlant?.id ?? selectedPlant?.name ?? "" : stepKey === "photo" ? state.photoUri ?? "" : ""}`;
  const contextRef = useRef({ key: stepContext, generation: 0 });
  if (contextRef.current.key !== stepContext) {
    contextRef.current = { key: stepContext, generation: contextRef.current.generation + 1 };
  }
  const generation = contextRef.current.generation;
  const [readiness, setReadiness] = useState({ generation: -1, ready: false });
  const onStepReady = useCallback((ready: boolean) => {
    if (contextRef.current.generation !== generation) return;
    setReadiness(previous => previous.generation === generation && previous.ready === ready
      ? previous : { generation, ready });
  }, [generation]);
  const stepReady = !ASYNC_STEPS.includes(stepKey) || (readiness.generation === generation && readiness.ready);

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return () => {};
    }, [])
  );

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

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

  const [measureModalOpen, setMeasureModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const scannerResultHandlerRef = useRef<((plant: Suggestion) => void) | null>(null);

  const registerScannerResultHandler = React.useCallback(
    (fn: (plant: Suggestion) => void) => {
      scannerResultHandlerRef.current = fn;
    },
    []
  );

  const handleScanResult = (plant: Suggestion) => {
    scannerResultHandlerRef.current?.(plant);
    setScannerModalOpen(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setLocationModalOpen(false);
      setMeasureModalOpen(false);
      setScannerModalOpen(false);
      locationCreateHandlerRef.current = null;
      scannerResultHandlerRef.current = null;

      return () => {
        setLocationModalOpen(false);
        setMeasureModalOpen(false);
        setScannerModalOpen(false);
      };
    }, [])
  );

  useEffect(() => {
    if (state.step !== "photo") setPhotoInteracting(false);
    if (state.step !== "location") setLocationModalOpen(false);
    if (state.step !== "exposure") setMeasureModalOpen(false);
    if (state.step !== "selectPlant") setScannerModalOpen(false);
  }, [state.step]);

  const entry = useRef(new Animated.Value(0)).current;
  const prevStepRef = useRef<StepKey>("selectPlant");
  const dirRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (prevStepRef.current !== stepKey) {
      const prevIdx = STEPS_ORDER.indexOf(prevStepRef.current);
      const nextIdx = STEPS_ORDER.indexOf(stepKey);
      dirRef.current = nextIdx > prevIdx ? 1 : -1;
      prevStepRef.current = stepKey;
    }
    entry.stopAnimation();
    entry.setValue(0);
    if (!stepReady) return;
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [stepKey, stepReady, entry]);

  const translateX = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [24 * dirRef.current, 0],
  });

  const opacity = entry.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const scale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  const floatingBottomOffset = 80;
  const extraBottomSpace = insets.bottom + floatingBottomOffset + 45;

  return (
    <>
      {!stepReady && <CenteredSpinner size={56} color="#FFFFFF" />}
      <ScrollView
        ref={scrollRef}
        style={!stepReady ? { display: "none" } : undefined}
        accessibilityElementsHidden={!stepReady}
        importantForAccessibility={!stepReady ? "no-hide-descendants" : "auto"}
        scrollEnabled={!photoInteracting}
        contentContainerStyle={[wiz.pageContent, { paddingBottom: extraBottomSpace }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
          {state.step === "selectPlant" && (
            <Step01_SelectPlant
              onScrollToTop={scrollTop}
              onOpenScanner={() => setScannerModalOpen(true)}
              onRegisterScanResultHandler={registerScannerResultHandler}
              onReadyChange={onStepReady}
            />
          )}
          {state.step === "traits" && <Step02_PlantTraits onReadyChange={onStepReady} />}
          {state.step === "location" && (
            <Step03_SelectLocation
              onScrollTop={scrollTop}
              onOpenAddLocation={() => setLocationModalOpen(true)}
              onRegisterCreateHandler={registerLocationCreateHandler}
              onReadyChange={onStepReady}
            />
          )}
          {state.step === "exposure" && (
            <Step04_Exposure
              measureUnit={settings.measureUnit === "imperial" ? "imperial" : "metric"}
              onOpenMeasureModal={() => setMeasureModalOpen(true)}
            />
          )}
          {state.step === "potType" && <Step05_ContainerAndSoil />}
          {state.step === "autoTasks" && <Step06_AutoTasks />}
          {state.step === "photo" && <Step07_Photo onInteractionChange={setPhotoInteracting} onReadyChange={onStepReady} />}
          {state.step === "name" && <Step08_NameAndNotes />}
          {state.step === "creating" && <Step09_Creating onReadyChange={onStepReady} />}

          {!STEPS_ORDER.includes(state.step as any) && (
            <View style={wiz.cardWrap}>
              <View style={wiz.cardGlass} />
              <View style={wiz.cardInner}>
                <Text style={wiz.title}>
                  {t("createPlant.fallbackStep.title", { step: state.step })}
                </Text>
                <Text style={wiz.subtitle}>
                  {t("createPlant.fallbackStep.subtitle")}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <PreviousNextBar
        bottomOffset={floatingBottomOffset}
        hidden={
          !stepReady ||
          (locationModalOpen && state.step === "location") ||
          (measureModalOpen && state.step === "exposure") ||
          (scannerModalOpen && state.step === "selectPlant")
        }
      />

      <AddLocationModal
        visible={locationModalOpen && state.step === "location"}
        onClose={() => setLocationModalOpen(false)}
        onCreate={handleLocationCreate}
      />

      <MeasureExposureModal
        visible={measureModalOpen && state.step === "exposure"}
        onClose={() => setMeasureModalOpen(false)}
        onApply={({ light, orientation }) => {
          if (light) actions.setLightLevel(light);
          if (orientation) actions.setOrientation(orientation);
        }}
      />

      <PlantScannerModal
        visible={scannerModalOpen && state.step === "selectPlant"}
        onClose={() => setScannerModalOpen(false)}
        onPlantDetected={handleScanResult}
      />
    </>
  );
}

export default function CreatePlantWizardScreen() {
  const { t } = useTranslation();

  return (
    <CreatePlantProvider>
      <ResetWizardOnFocus />
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={t("createPlant.header.title")}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
        />
        <WizardBody />
      </View>
    </CreatePlantProvider>
  );
}
