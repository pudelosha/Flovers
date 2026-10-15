import React, { useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

export default function ResetWizardOnFocus() {
  const { state, actions } = useCreatePlantWizard();
  const stepRef = useRef(state.step);
  useEffect(() => { stepRef.current = state.step; }, [state.step]);

  useFocusEffect(
    React.useCallback(() => {
      // Preserve the result ID and inputs while a creation or photo retry is pending.
      if (stepRef.current !== "creating") actions.reset();
    }, [actions])
  );

  return null;
}
