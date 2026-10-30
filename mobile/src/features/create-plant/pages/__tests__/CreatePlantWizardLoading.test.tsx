import React from "react";
import { Animated, ScrollView, StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import CreatePlantWizardScreen from "../CreatePlantWizardScreen";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import PreviousNextBar from "../../components/PreviousNextBar";

let mockState: any;
let mockLanguage = "en";
const mockActions = { setLightLevel: jest.fn(), setOrientation: jest.fn() };
function mockStep(name: string, props: any) {
  const React = require("react"); const { View, Text } = require("react-native");
  return React.createElement(View, { ...props, testID: `wizard-step-${name}` }, React.createElement(Text, null, `${name} tile`));
}
jest.mock("../../context/CreatePlantProvider", () => ({ CreatePlantProvider: ({ children }: any) => children }));
jest.mock("../../hooks/useCreatePlantWizard", () => ({ useCreatePlantWizard: () => ({ state: mockState, actions: mockActions }) }));
jest.mock("../../../../app/providers/LanguageProvider", () => ({ useLanguage: () => ({ currentLanguage: mockLanguage }) }));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { measureUnit: "metric" } }) }));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: any) => require("react").useEffect(() => callback(), [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../../../../shared/ui/GlassHeader", () => () => null);
jest.mock("../../components/ResetWizardOnFocus", () => () => null);
jest.mock("../../components/PreviousNextBar", () => (props: any) => props.hidden ? null
  : require("react").createElement(require("react-native").Text, null, "Wizard navigation"));
jest.mock("../../components/modals/AddLocationModal", () => () => null);
jest.mock("../../components/modals/MeasureExposureModal", () => () => null);
jest.mock("../../components/modals/PlantScannerModal", () => () => null);
jest.mock("../../steps/Step01_SelectPlant", () => (props: any) => mockStep("selectPlant", props));
jest.mock("../../steps/Step02_PlantTraits", () => (props: any) => mockStep("traits", props));
jest.mock("../../steps/Step03_SelectLocation", () => (props: any) => mockStep("location", props));
jest.mock("../../steps/Step04_Exposure", () => (props: any) => mockStep("exposure", props));
jest.mock("../../steps/Step05_ContainerAndSoil", () => (props: any) => mockStep("potType", props));
jest.mock("../../steps/Step06_AutoTasks", () => (props: any) => mockStep("autoTasks", props));
jest.mock("../../steps/Step07_Photo", () => (props: any) => mockStep("photo", props));
jest.mock("../../steps/Step08_NameAndNotes", () => (props: any) => mockStep("name", props));
jest.mock("../../steps/Step09_Creating", () => (props: any) => mockStep("creating", props));

beforeEach(() => {
  jest.clearAllMocks(); mockLanguage = "en"; mockState = { step: "selectPlant" };
  jest.spyOn(Animated, "timing").mockImplementation((value, config) => ({
    start: jest.fn(() => (value as Animated.Value).setValue(Number(config.toValue))), stop: jest.fn(), reset: jest.fn(),
  }));
});
afterEach(() => { jest.restoreAllMocks(); });
const currentStep = (view: ReturnType<typeof render>, step: string) =>
  view.getByTestId(`wizard-step-${step}`, { includeHiddenElements: true });
const scrollDisplay = (view: ReturnType<typeof render>) => StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.style)?.display;

it("keeps the fetching step mounted but hides the card and navigation behind the shared spinner", () => {
  const view = render(<CreatePlantWizardScreen />);
  expect(currentStep(view, "selectPlant")).toBeTruthy();
  expect(scrollDisplay(view)).toBe("none");
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByText("selectPlant tile")).toBeNull();
  expect(view.UNSAFE_getByType(PreviousNextBar).props.hidden).toBe(true);
  expect(Animated.timing).not.toHaveBeenCalled();

  fireEvent(currentStep(view, "selectPlant"), "readyChange", true);
  expect(scrollDisplay(view)).toBeUndefined();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(view.UNSAFE_getByType(PreviousNextBar).props.hidden).toBe(false);
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 260 }));
});

it("does not let a completed old step reveal a new step that is still loading", () => {
  const view = render(<CreatePlantWizardScreen />);
  const oldReady = currentStep(view, "selectPlant").props.onReadyChange;
  mockState = { step: "traits", selectedPlant: { id: "1" } };
  view.rerender(<CreatePlantWizardScreen />);
  act(() => oldReady(true));
  expect(scrollDisplay(view)).toBe("none");
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(Animated.timing).not.toHaveBeenCalled();
  fireEvent(currentStep(view, "traits"), "readyChange", true);
  expect(scrollDisplay(view)).toBeUndefined();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});

it("renders static steps immediately without waiting for an asynchronous readiness callback", () => {
  mockState = { step: "exposure" };
  const view = render(<CreatePlantWizardScreen />);
  expect(scrollDisplay(view)).toBeUndefined();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(view.UNSAFE_getByType(PreviousNextBar).props.hidden).toBe(false);
  expect(Animated.timing).toHaveBeenCalledTimes(1);
});

it.each([
  { name: "language", step: "selectPlant", initial: {}, change: () => { mockLanguage = "pl"; } },
  { name: "selected definition", step: "traits", initial: { selectedPlant: { id: "1" } }, change: () => { mockState.selectedPlant = { id: "2" }; } },
  { name: "photo", step: "photo", initial: { photoUri: "file:///one.jpg" }, change: () => { mockState.photoUri = "file:///two.jpg"; } },
])("waits again after the $name changes and rejects the previous readiness callback", ({ step, initial, change }) => {
  mockState = { step, ...initial };
  const view = render(<CreatePlantWizardScreen />);
  const oldReady = currentStep(view, step).props.onReadyChange;
  fireEvent(currentStep(view, step), "readyChange", true);
  expect(scrollDisplay(view)).toBeUndefined();
  change(); view.rerender(<CreatePlantWizardScreen />);
  expect(scrollDisplay(view)).toBe("none");
  act(() => oldReady(true));
  expect(scrollDisplay(view)).toBe("none");
  fireEvent(currentStep(view, step), "readyChange", true);
  expect(scrollDisplay(view)).toBeUndefined();
});
