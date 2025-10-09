// src/features/create-plant/components/StepperHeader.tsx
import React from "react";
import { View, Text } from "react-native";
import { wizard } from "../styles/wizard.styles";
import { TOTAL_STEPS } from "../constants/create-plant.constants";

export default function StepperHeader({ step }: { step: number }) {
  return (
    <View style={wizard.stepper}>
      <Text style={wizard.stepperText}>{`Step ${step} / ${TOTAL_STEPS}`}</Text>
    </View>
  );
}
