// context/CreatePlantProvider.tsx
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
  LastWatered,
  LastRepotted,
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
  | { type: "SET_SOIL_MIX"; val?: SoilMix }
  // Step 6
  | { type: "SET_CREATE_AUTO"; val: boolean }
  | { type: "SET_WATER_TASK_ENABLED"; val: boolean }
  | { type: "SET_REPOT_TASK_ENABLED"; val: boolean }
  | { type: "SET_LAST_WATERED"; val?: LastWatered }
  | { type: "SET_LAST_REPOTTED"; val?: LastRepotted }
  | { type: "SET_MOISTURE_REQUIRED"; val: boolean }
  | { type: "SET_MOISTURE_INTERVAL"; val: number }
  | { type: "SET_FERTILIZE_REQUIRED"; val: boolean }
  | { type: "SET_FERTILIZE_INTERVAL"; val: number }
  | { type: "SET_CARE_REQUIRED"; val: boolean }
  | { type: "SET_CARE_INTERVAL"; val: number }
  | { type: "SET_REPOT_INTERVAL_MONTHS"; val: number }
  // Step 7
  | { type: "SET_PHOTO_URI"; uri?: string }
  | { type: "CLEAR_PHOTO" }
  // Step 8
  | { type: "SET_DISPLAY_NAME"; val: string }
  | { type: "SET_NOTES"; val: string }
  | { type: "SET_PURCHASE_DATE_ISO"; val?: string };

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

  // Step 6 defaults
  createAutoTasks: false,
  waterTaskEnabled: false,
  repotTaskEnabled: false,
  moistureRequired: false,
  fertilizeRequired: false,
  careRequired: false,
  lastWatered: undefined,
  lastRepotted: undefined,
  moistureIntervalDays: 7,
  fertilizeIntervalDays: 30,
  careIntervalDays: 30,
  repotIntervalMonths: 12,

  // Step 7
  photoUri: undefined,

  // Step 8
  displayName: "",
  notes: "",
  purchaseDateISO: undefined,
};

// 🔵 ORDER: keep “photo” as Step 7 and place “name” right after it (Step 8).
// (distance becomes Step 9, still fine if unimplemented)
const ORDER: WizardStep[] = [
  "selectPlant",
  "traits",
  "location",
  "exposure",
  "potType",
  "autoTasks",
  "photo",     // Step 7
  "name",      // Step 8
  "distance",  // Step 9 (can show fallback)
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

    // Step 6
    case "SET_CREATE_AUTO":
      return action.val
        ? { ...state, createAutoTasks: true, waterTaskEnabled: true }
        : { ...state, createAutoTasks: false };
    case "SET_WATER_TASK_ENABLED":
      return { ...state, waterTaskEnabled: action.val };
    case "SET_REPOT_TASK_ENABLED":
      return { ...state, repotTaskEnabled: action.val };
    case "SET_LAST_WATERED":
      return { ...state, lastWatered: action.val };
    case "SET_LAST_REPOTTED":
      return { ...state, lastRepotted: action.val };
    case "SET_MOISTURE_REQUIRED":
      return { ...state, moistureRequired: action.val };
    case "SET_MOISTURE_INTERVAL":
      return { ...state, moistureIntervalDays: Math.max(1, Math.min(30, action.val)) };
    case "SET_FERTILIZE_REQUIRED":
      return { ...state, fertilizeRequired: action.val };
    case "SET_FERTILIZE_INTERVAL":
      return { ...state, fertilizeIntervalDays: Math.max(1, Math.min(60, action.val)) };
    case "SET_CARE_REQUIRED":
      return { ...state, careRequired: action.val };
    case "SET_CARE_INTERVAL":
      return { ...state, careIntervalDays: Math.max(1, Math.min(60, action.val)) };
    case "SET_REPOT_INTERVAL_MONTHS":
      return { ...state, repotIntervalMonths: Math.max(1, Math.min(12, action.val)) };

    // Step 7
    case "SET_PHOTO_URI":
      return { ...state, photoUri: action.uri };
    case "CLEAR_PHOTO":
      return { ...state, photoUri: undefined };

    // Step 8
    case "SET_DISPLAY_NAME":
      return { ...state, displayName: action.val };
    case "SET_NOTES":
      return { ...state, notes: action.val };
    case "SET_PURCHASE_DATE_ISO":
      return { ...state, purchaseDateISO: action.val };

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

    // Step 6
    setCreateAutoTasks: (v: boolean) => void;
    setWaterTaskEnabled: (v: boolean) => void;
    setRepotTaskEnabled: (v: boolean) => void;
    setLastWatered: (v?: LastWatered) => void;
    setLastRepotted: (v?: LastRepotted) => void;
    setMoistureRequired: (v: boolean) => void;
    setMoistureInterval: (d: number) => void;
    setFertilizeRequired: (v: boolean) => void;
    setFertilizeInterval: (d: number) => void;
    setCareRequired: (v: boolean) => void;
    setCareInterval: (d: number) => void;
    setRepotIntervalMonths: (m: number) => void;

    // Step 7
    setPhotoUri: (uri?: string) => void;
    clearPhoto: () => void;

    // Step 8
    setDisplayName: (v: string) => void;
    setNotes: (v: string) => void;
    setPurchaseDateISO: (v?: string) => void;
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

      // Step 6
      setCreateAutoTasks: (v: boolean) => dispatch({ type: "SET_CREATE_AUTO", val: v }),
      setWaterTaskEnabled: (v: boolean) => dispatch({ type: "SET_WATER_TASK_ENABLED", val: v }),
      setRepotTaskEnabled: (v: boolean) => dispatch({ type: "SET_REPOT_TASK_ENABLED", val: v }),
      setLastWatered: (v?: LastWatered) => dispatch({ type: "SET_LAST_WATERED", val: v }),
      setLastRepotted: (v?: LastRepotted) => dispatch({ type: "SET_LAST_REPOTTED", val: v }),
      setMoistureRequired: (v: boolean) => dispatch({ type: "SET_MOISTURE_REQUIRED", val: v }),
      setMoistureInterval: (d: number) => dispatch({ type: "SET_MOISTURE_INTERVAL", val: d }),
      setFertilizeRequired: (v: boolean) => dispatch({ type: "SET_FERTILIZE_REQUIRED", val: v }),
      setFertilizeInterval: (d: number) => dispatch({ type: "SET_FERTILIZE_INTERVAL", val: d }),
      setCareRequired: (v: boolean) => dispatch({ type: "SET_CARE_REQUIRED", val: v }),
      setCareInterval: (d: number) => dispatch({ type: "SET_CARE_INTERVAL", val: d }),
      setRepotIntervalMonths: (m: number) => dispatch({ type: "SET_REPOT_INTERVAL_MONTHS", val: m }),

      // Step 7
      setPhotoUri: (uri?: string) => dispatch({ type: "SET_PHOTO_URI", uri }),
      clearPhoto: () => dispatch({ type: "CLEAR_PHOTO" }),

      // Step 8
      setDisplayName: (v: string) => dispatch({ type: "SET_DISPLAY_NAME", val: v }),
      setNotes: (v: string) => dispatch({ type: "SET_NOTES", val: v }),
      setPurchaseDateISO: (v?: string) => dispatch({ type: "SET_PURCHASE_DATE_ISO", val: v }),
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
