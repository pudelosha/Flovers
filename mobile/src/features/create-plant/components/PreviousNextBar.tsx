// src/features/create-plant/components/PreviousNextBar.tsx
import React, { useMemo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

type Props = {
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  hidden?: boolean;
  bottomOffset?: number;
};

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

type StepKey = (typeof STEPS_ORDER)[number];

export default function PreviousNextBar({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
  hidden = false,
  bottomOffset = 92,
}: Props) {
  const insets = useSafeAreaInsets();
  const { state, actions } = useCreatePlantWizard();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // IMPORTANT: compute step safely, but DO NOT early-return before hooks below
  const hasStep = !!state?.step;
  const step = ((state?.step as StepKey) ?? "selectPlant") as StepKey;

  // A plant is "selected" if it exists (regardless of predefined/scanned)
  const hasSelectedPlant = !!state?.selectedPlant?.id;

  // IMPORTANT: this hook must run on every render (even when hidden)
  const defaults = useMemo(() => {
    const hidePrev = step === "selectPlant";
    const isCreateStep = step === "name";
    return {
      hidePrev,
      prevLabel: t("createPlant.common.previous"),
      nextLabel: isCreateStep
        ? t("createPlant.common.create")
        : t("createPlant.common.next"),
    };
  }, [step, t, currentLanguage]);

  // Now it's safe to return early (after all hooks are called consistently)
  if (hidden || !hasStep) return null;

  const prevHandler = () => {
    if (step === "selectPlant") return;

    // If user skipped plant selection, they landed on location.
    // Going back from location should return to selectPlant.
    if (step === "location" && !hasSelectedPlant) {
      actions.goTo("selectPlant");
      return;
    }

    actions.goPrev();
  };

  const nextHandler = () => {
    if (step === "selectPlant") {
      // If any plant selected -> go to traits (Step 2), else skip to location (Step 3)
      if (hasSelectedPlant) actions.goNext(); // traits
      else actions.goTo("location"); // skip traits
      return;
    }

    if (step === "name") {
      actions.goTo("creating"); // Create
      return;
    }

    actions.goNext();
  };

  const handlePrev = onPrev || prevHandler;
  const handleNext = onNext || nextHandler;

  // Disable Next on Step 3 until a location is selected
  const blockNextBecauseOfStep = step === "location" && !state?.selectedLocationId;

  const isPrevDisabled = !!prevDisabled || defaults.hidePrev;
  const isNextDisabled = !!nextDisabled || blockNextBecauseOfStep;

  const prevBg = "#263238";
  const nextBg = "#0B7285";
  const borderStyle = {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  } as const;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: insets.bottom + bottomOffset,
        zIndex: 40,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        {/* Keep 50:50 layout — placeholder on Step 1 */}
        {defaults.hidePrev ? (
          <View style={{ flex: 1 }} pointerEvents="none" />
        ) : (
          <Pressable
            onPress={handlePrev}
            disabled={isPrevDisabled}
            style={[
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: prevBg,
                paddingHorizontal: 14,
                opacity: isPrevDisabled ? 0.5 : 1,
              },
              borderStyle,
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
              <Text style={wiz.nextBtnText}>{prevLabel ?? defaults.prevLabel}</Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={handleNext}
          disabled={isNextDisabled}
          style={[
            wiz.nextBtnWide,
            {
              flex: 1,
              backgroundColor: nextBg,
              paddingHorizontal: 14,
              opacity: isNextDisabled ? 0.5 : 1,
            },
            borderStyle,
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              width: "100%",
            }}
          >
            <Text style={wiz.nextBtnText}>{nextLabel ?? defaults.nextLabel}</Text>
            <MaterialCommunityIcons
              name={step === "name" ? "check" : "chevron-right"}
              size={18}
              color="#FFFFFF"
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
