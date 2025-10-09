import React from "react";
import { View, Pressable, Text } from "react-native";
import { wiz } from "../styles/wizard.styles";

export default function WizardFooter({
  onPrev,
  onNext,
  nextLabel = "Next",
  prevLabel = "Previous",
  nextDisabled = false,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <View style={wiz.footerWrap}>
      <View style={wiz.footerRowFull}>
        <Pressable style={[wiz.splitBtn, wiz.splitBtnSecondary]} onPress={onPrev}>
          <Text style={wiz.splitBtnText}>{prevLabel}</Text>
        </Pressable>
        <Pressable
          style={[wiz.splitBtn, wiz.splitBtnPrimary, nextDisabled && { opacity: 0.6 }]}
          onPress={onNext}
          disabled={nextDisabled}
        >
          <Text style={wiz.splitBtnText}>{nextLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
