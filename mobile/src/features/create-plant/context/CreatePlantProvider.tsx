import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
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
  PlantDefinition,
  PlantProfile,
} from "../types/create-plant.types";
import { createPlantInstance } from "../../../api/services/plant-instances.service";
import { deleteLocalPhoto } from "../../../shared/utils/photoStorage";
import { uploadPlantPhoto, updatePlantPhotoFraming, type PlantPhoto } from "../../../api/services/plant-photos.service";
import { DEFAULT_PHOTO_FRAMING, normalizePhotoFraming, type PhotoFraming } from "../../../shared/utils/photoFraming";

type Action =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_SELECTED_PLANT"; plant?: SelectedPlant }
  | { type: "SET_SELECTED_PLANT_DEFINITION"; def?: PlantDefinition | PlantProfile }
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
  | { type: "SET_WATER_INTERVAL_DAYS"; val: number }
  // Step 7
  | { type: "SET_PHOTO_URI"; uri?: string }
  | { type: "SET_PHOTO_FRAMING"; framing: PhotoFraming }
  | { type: "CLEAR_PHOTO" }
  // Step 8
  | { type: "SET_DISPLAY_NAME"; val: string }
  | { type: "SET_NOTES"; val: string }
  | { type: "SET_PURCHASE_DATE_ISO"; val?: string };

const initial: WizardState = {
  step: "selectPlant",
  plantQuery: "",
  selectedPlant: undefined,
  selectedPlantDefinition: undefined,

  locations: [],
  selectedLocationId: null,
  lightLevel: "bright-indirect",
  orientation: "E",
  distanceCm: 20,
  potMaterial: undefined,
  soilMix: undefined,
  createAutoTasks: false,
  waterTaskEnabled: false,
  repotTaskEnabled: false,
  moistureRequired: false,
  fertilizeRequired: false,
  careRequired: false,
  lastWatered: undefined,
  lastRepotted: undefined,
  waterIntervalDays: 7,
  moistureIntervalDays: 7,
  fertilizeIntervalDays: 30,
  careIntervalDays: 30,
  repotIntervalMonths: 12,
  photoUri: undefined,
  photoFraming: DEFAULT_PHOTO_FRAMING,
  displayName: "",
  notes: "",
  purchaseDateISO: undefined,
  createdPlantId: undefined,
};

const ORDER: WizardStep[] = [
  "selectPlant",
  "traits",
  "location",
  "exposure",
  "potType",
  "autoTasks",
  "photo",
  "name",
  "creating",
  "summary",
  "distance",
];

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, plantQuery: action.query };

    case "SET_SELECTED_PLANT":
      return {
        ...state,
        selectedPlant: action.plant
          ? {
              ...action.plant,
              latin: action.plant.latin.replace(/_/g, " "),
            }
          : undefined,
      };

    case "SET_SELECTED_PLANT_DEFINITION":
      return { ...state, selectedPlantDefinition: action.def };

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
      return {
        ...state,
        locations: [...state.locations, action.loc],
        selectedLocationId: action.loc.id,
      };
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

    case "SET_CREATE_AUTO":
      return action.val
        ? { ...state, createAutoTasks: true }
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
      return { ...state, moistureIntervalDays: Math.max(1, Math.min(90, action.val)) };
    case "SET_FERTILIZE_REQUIRED":
      return { ...state, fertilizeRequired: action.val };
    case "SET_FERTILIZE_INTERVAL":
      return { ...state, fertilizeIntervalDays: Math.max(1, Math.min(90, action.val)) };
    case "SET_CARE_REQUIRED":
      return { ...state, careRequired: action.val };
    case "SET_CARE_INTERVAL":
      return { ...state, careIntervalDays: Math.max(1, Math.min(90, action.val)) };
    case "SET_REPOT_INTERVAL_MONTHS":
      return { ...state, repotIntervalMonths: Math.max(1, Math.min(12, action.val)) };
    case "SET_WATER_INTERVAL_DAYS":
      return { ...state, waterIntervalDays: Math.max(1, Math.min(90, action.val)) };

    case "SET_PHOTO_URI":
      return { ...state, photoUri: action.uri, photoFraming: DEFAULT_PHOTO_FRAMING };
    case "SET_PHOTO_FRAMING":
      return { ...state, photoFraming: normalizePhotoFraming(action.framing) };
    case "CLEAR_PHOTO":
      return { ...state, photoUri: undefined, photoFraming: DEFAULT_PHOTO_FRAMING };

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

    setSelectedPlantDefinition: (def?: PlantDefinition | PlantProfile) => void;

    goNext: () => void;
    goPrev: () => void;
    goTo: (s: WizardStep) => void;
    reset: () => void;
    patch: (patch: Partial<WizardState>) => void;

    addLocation: (name: string, category: LocationCategory, idOverride?: string) => void;
    selectLocation: (id: string) => void;

    setLightLevel: (level: LightLevel) => void;
    setOrientation: (o: Orientation) => void;
    setDistanceCm: (cm: number) => void;

    setPotMaterial: (m?: PotMaterial) => void;
    setSoilMix: (m?: SoilMix) => void;

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
    setWaterIntervalDays: (d: number) => void;

    setPhotoUri: (uri?: string) => void;
    setPhotoFraming: (framing: PhotoFraming) => void;
    clearPhoto: () => void;

    setDisplayName: (v: string) => void;
    setNotes: (v: string) => void;
    setPurchaseDateISO: (v?: string) => void;

    createPlant: () => Promise<string>;
  };
} | null>(null);

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// An identifier for a logical creation, retained when a response is lost.
function newCreationKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 3) | 8).toString(16);
  });
}

export function CreatePlantProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const stateRef = useRef(state);
  const createdPlantIdRef = useRef<string | undefined>(undefined);
  const savedPhotoUriRef = useRef<string | undefined>(undefined);
  const uploadedPhotoRef = useRef<PlantPhoto | null>(null);
  const creationInFlightRef = useRef<Promise<string> | null>(null);
  const creationKeyRef = useRef<string | null>(null);
  const photoUploadKeyRef = useRef<{ uri: string; key: string } | null>(null);
  const creationGenerationRef = useRef(0);
  if (!creationKeyRef.current) creationKeyRef.current = newCreationKey();
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const createPlant = useCallback(async (): Promise<string> => {
    if (creationInFlightRef.current) return creationInFlightRef.current;

    const generation = creationGenerationRef.current;
    const assertCurrentDraft = () => {
      if (generation !== creationGenerationRef.current) throw new Error("Creation draft changed.");
    };
    const attempt = (async () => {
      const s = stateRef.current;
      let newId = createdPlantIdRef.current ?? s.createdPlantId;

      if (!newId) {
        if (!s.selectedLocationId) {
          throw new Error("Location is required to create a plant.");
        }
        const created = await createPlantInstance(s, {
          auth: true,
          creationKey: creationKeyRef.current!,
        });
        assertCurrentDraft();
        newId = String(created.id);
        createdPlantIdRef.current = newId;
        stateRef.current = { ...stateRef.current, createdPlantId: newId };
        dispatch({ type: "PATCH", patch: { createdPlantId: newId } });
      }

      if (s.photoUri && s.photoUri !== savedPhotoUriRef.current) {
        if (photoUploadKeyRef.current?.uri !== s.photoUri) {
          photoUploadKeyRef.current = { uri: s.photoUri, key: newCreationKey() };
        }
        const framing = normalizePhotoFraming(s.photoFraming);
        let photo = await uploadPlantPhoto(newId, s.photoUri, {
          uploadKey: photoUploadKeyRef.current.key,
          expectedPhotoId: null,
          framing,
        });
        assertCurrentDraft();
        if (JSON.stringify(normalizePhotoFraming(photo?.framing)) !== JSON.stringify(framing)) {
          photo = await updatePlantPhotoFraming(newId, framing, {
            expectedPhotoId: photo.id,
            // Never turn a recovered upload into permission to overwrite a
            // newer framing saved by another device.
            expectedFramingRevision: 0,
          });
          assertCurrentDraft();
        }
        // Only a confirmed server upload completes this step. A failed upload
        // retains the source and plant ID so Retry never creates another plant.
        savedPhotoUriRef.current = s.photoUri;
        uploadedPhotoRef.current = photo;
        await deleteLocalPhoto(s.photoUri).catch(() => {});
      } else if (s.photoUri && uploadedPhotoRef.current
          && JSON.stringify(normalizePhotoFraming(uploadedPhotoRef.current.framing)) !== JSON.stringify(normalizePhotoFraming(s.photoFraming))) {
        const photo = uploadedPhotoRef.current;
        const updated = await updatePlantPhotoFraming(newId, normalizePhotoFraming(s.photoFraming), {
          expectedPhotoId: photo.id,
          expectedFramingRevision: photo.framing_revision ?? 0,
        });
        assertCurrentDraft();
        uploadedPhotoRef.current = updated;
      }

      return newId;
    })();
    creationInFlightRef.current = attempt;
    try {
      return await attempt;
    } finally {
      if (creationInFlightRef.current === attempt) creationInFlightRef.current = null;
    }
  }, []);

  const actions = useMemo(
    () => ({
      setPlantQuery: (q: string) => dispatch({ type: "SET_QUERY", query: q }),

      setSelectedPlant: (p?: SelectedPlant) => {
        if (p && p.latin) {
          p.latin = p.latin.replace(/_/g, " ");
        }
        dispatch({ type: "SET_SELECTED_PLANT", plant: p });
      },

      setSelectedPlantDefinition: (def?: PlantDefinition | PlantProfile) =>
        dispatch({ type: "SET_SELECTED_PLANT_DEFINITION", def }),

      goNext: () => dispatch({ type: "NEXT" }),
      goPrev: () => dispatch({ type: "PREV" }),
      goTo: (s: WizardStep) => dispatch({ type: "GOTO", step: s }),
      reset: () => {
        creationGenerationRef.current += 1;
        creationInFlightRef.current = null;
        creationKeyRef.current = newCreationKey();
        createdPlantIdRef.current = undefined;
        savedPhotoUriRef.current = undefined;
        uploadedPhotoRef.current = null;
        photoUploadKeyRef.current = null;
        stateRef.current = { ...initial };
        dispatch({ type: "RESET" });
      },
      patch: (patch: Partial<WizardState>) => dispatch({ type: "PATCH", patch }),

      addLocation: (name: string, category: LocationCategory, idOverride?: string) =>
        dispatch({ type: "ADD_LOCATION", loc: { id: idOverride ?? genId(), name, category } }),
      selectLocation: (locId: string) => dispatch({ type: "SELECT_LOCATION", id: locId }),

      setLightLevel: (level: LightLevel) => dispatch({ type: "SET_LIGHT", val: level }),
      setOrientation: (o: Orientation) => dispatch({ type: "SET_ORIENTATION", val: o }),
      setDistanceCm: (cm: number) => dispatch({ type: "SET_DISTANCE_CM", val: cm }),

      setPotMaterial: (m?: PotMaterial) => dispatch({ type: "SET_POT_MATERIAL", val: m }),
      setSoilMix: (m?: SoilMix) => dispatch({ type: "SET_SOIL_MIX", val: m }),

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
      setWaterIntervalDays: (d: number) => dispatch({ type: "SET_WATER_INTERVAL_DAYS", val: d }),

      setPhotoUri: (uri?: string) => dispatch({ type: "SET_PHOTO_URI", uri }),
      setPhotoFraming: (framing: PhotoFraming) => dispatch({ type: "SET_PHOTO_FRAMING", framing }),
      clearPhoto: () => dispatch({ type: "CLEAR_PHOTO" }),

      setDisplayName: (v: string) => dispatch({ type: "SET_DISPLAY_NAME", val: v }),
      setNotes: (v: string) => dispatch({ type: "SET_NOTES", val: v }),
      setPurchaseDateISO: (v?: string) => dispatch({ type: "SET_PURCHASE_DATE_ISO", val: v }),

      createPlant,
    }),
    [createPlant]
  );

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}

export function useCreatePlantWizard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCreatePlantWizard must be used within CreatePlantProvider");
  return ctx;
}
