// src/features/create-plant/components/WizardFooter.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import { wizard } from "../styles/wizard.styles";

type Props = {
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  showPrev?: boolean;
  alignLeft?: boolean;
  nextDisabled?: boolean;
};

export default function WizardFooter({
  onPrev,
  onNext,
  nextLabel = "Next",
  showPrev = false,
  alignLeft = false,
  nextDisabled = false,
}: Props) {
  return (
    <View style={wizard.footerWrap}>
      <View style={[wizard.footerRow, alignLeft && { justifyContent: "flex-start" }]}>
        {showPrev && (
          <Pressable style={[wizard.btn, { marginRight: 10 }]} onPress={onPrev}>
            <Text style={wizard.btnText}>Previous</Text>
          </Pressable>
        )}
        <Pressable
          style={[wizard.btn, wizard.btnPrimary]}
          onPress={onNext}
          disabled={nextDisabled}
        >
          <Text style={wizard.btnText}>{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
