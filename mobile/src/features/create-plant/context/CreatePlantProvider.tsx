import React, { createContext, useContext, useMemo, useReducer } from "react";
import type {
  WizardState,
  SelectedPlant,
  WizardStep,
  UserLocation,
  LocationCategory,
  LightLevel,
  Orientation,
  PotMaterial,
  SoilMix,
} from "../types/create-plant.types";

type Action =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_SELECTED_PLANT"; plant?: SelectedPlant }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; step: WizardStep }
  | { type: "RESET" }
  | { type: "PATCH"; patch: Partial<WizardState> }
  | { type: "ADD_LOCATION"; loc: UserLocation }
  | { type: "SELECT_LOCATION"; id: string }
  | { type: "SET_LIGHT"; val: WizardState["lightLevel"] }
  | { type: "SET_ORIENTATION"; val: WizardState["orientation"] }
  | { type: "SET_DISTANCE_CM"; val: number }
  | { type: "SET_POT_MATERIAL"; val?: PotMaterial }
  | { type: "SET_SOIL_MIX"; val?: SoilMix };

const initial: WizardState = {
  step: "selectPlant",
  plantQuery: "",
  selectedPlant: undefined,

  locations: [],
  selectedLocationId: undefined,

  // Step 4 defaults
  lightLevel: "bright-indirect",
  orientation: "E",
  distanceCm: 20,

  // Step 5 (optional)
  potMaterial: undefined,
  soilMix: undefined,
};

// ⬇️ Put "potType" immediately after "exposure" so it becomes Step 5
const ORDER: WizardStep[] = [
  "selectPlant",
  "traits",
  "location",
  "exposure",
  "potType",     // <-- moved up
  "distance",
  "autoTasks",
  "photo",
  "name",
  "summary",
];

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, plantQuery: action.query };
    case "SET_SELECTED_PLANT":
      return { ...state, selectedPlant: action.plant };

    case "NEXT": {
      const idx = ORDER.indexOf(state.step);
      return { ...state, step: ORDER[Math.min(idx + 1, ORDER.length - 1)] };
    }
    case "PREV": {
      const idx = ORDER.indexOf(state.step);
      return { ...state, step: ORDER[Math.max(idx - 1, 0)] };
    }
    case "GOTO":
      return { ...state, step: action.step };
    case "RESET":
      return { ...initial };
    case "PATCH":
      return { ...state, ...action.patch };

    case "ADD_LOCATION":
      return { ...state, locations: [...state.locations, action.loc], selectedLocationId: action.loc.id };
    case "SELECT_LOCATION":
      return { ...state, selectedLocationId: action.id };

    case "SET_LIGHT":
      return { ...state, lightLevel: action.val };
    case "SET_ORIENTATION":
      return { ...state, orientation: action.val };
    case "SET_DISTANCE_CM":
      return { ...state, distanceCm: action.val };

    case "SET_POT_MATERIAL":
      return { ...state, potMaterial: action.val };
    case "SET_SOIL_MIX":
      return { ...state, soilMix: action.val };

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
    reset: () => void;
    patch: (patch: Partial<WizardState>) => void;

    addLocation: (name: string, category: LocationCategory) => void;
    selectLocation: (id: string) => void;

    setLightLevel: (level: LightLevel) => void;
    setOrientation: (o: Orientation) => void;
    setDistanceCm: (cm: number) => void;

    setPotMaterial: (m?: PotMaterial) => void;
    setSoilMix: (m?: SoilMix) => void;
  };
} | null>(null);

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function CreatePlantProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const actions = useMemo(
    () => ({
      setPlantQuery: (q: string) => dispatch({ type: "SET_QUERY", query: q }),
      setSelectedPlant: (p?: SelectedPlant) => dispatch({ type: "SET_SELECTED_PLANT", plant: p }),
      goNext: () => dispatch({ type: "NEXT" }),
      goPrev: () => dispatch({ type: "PREV" }),
      goTo: (s: WizardStep) => dispatch({ type: "GOTO", step: s }),
      reset: () => dispatch({ type: "RESET" }),
      patch: (patch: Partial<WizardState>) => dispatch({ type: "PATCH", patch }),

      addLocation: (name: string, category: LocationCategory) =>
        dispatch({ type: "ADD_LOCATION", loc: { id: id(), name, category } }),
      selectLocation: (locId: string) => dispatch({ type: "SELECT_LOCATION", id: locId }),

      setLightLevel: (level: LightLevel) => dispatch({ type: "SET_LIGHT", val: level }),
      setOrientation: (o: Orientation) => dispatch({ type: "SET_ORIENTATION", val: o }),
      setDistanceCm: (cm: number) => dispatch({ type: "SET_DISTANCE_CM", val: cm }),

      setPotMaterial: (m?: PotMaterial) => dispatch({ type: "SET_POT_MATERIAL", val: m }),
      setSoilMix: (m?: SoilMix) => dispatch({ type: "SET_SOIL_MIX", val: m }),
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
