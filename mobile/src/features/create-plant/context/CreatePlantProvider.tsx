import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { WizardState, SelectedPlant, WizardStep } from "../types/create-plant.types";

type Action =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_SELECTED_PLANT"; plant?: SelectedPlant }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; step: WizardStep };

const initial: WizardState = {
  step: "selectPlant",
  plantQuery: "",
  selectedPlant: undefined,
};

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, plantQuery: action.query };
    case "SET_SELECTED_PLANT":
      return { ...state, selectedPlant: action.plant };
    case "NEXT": {
      // lightweight step machine (only step1 for now)
      return { ...state, step: "traits" };
    }
    case "PREV":
      return { ...state, step: "selectPlant" };
    case "GOTO":
      return { ...state, step: action.step };
    default:
      return state;
  }
}

const Ctx = createContext<{
  state: WizardState;
  actions: {
    setPlantQuery: (q: string) => void;
    setSelectedPlant: (p?: SelectedPlant) => void;
    goNext: () => void;
    goPrev: () => void;
    goTo: (s: WizardStep) => void;
  };
} | null>(null);

export function CreatePlantProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const actions = useMemo(
    () => ({
      setPlantQuery: (q: string) => dispatch({ type: "SET_QUERY", query: q }),
      setSelectedPlant: (p?: SelectedPlant) => dispatch({ type: "SET_SELECTED_PLANT", plant: p }),
      goNext: () => dispatch({ type: "NEXT" }),
      goPrev: () => dispatch({ type: "PREV" }),
      goTo: (s: WizardStep) => dispatch({ type: "GOTO", step: s }),
    }),
    []
  );

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}

export function useCreatePlantWizard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCreatePlantWizard must be used within CreatePlantProvider");
  return ctx;
}
