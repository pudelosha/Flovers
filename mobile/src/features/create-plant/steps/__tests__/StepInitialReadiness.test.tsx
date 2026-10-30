import React from "react";
import { Animated } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import Step01_SelectPlant from "../Step01_SelectPlant";
import Step03_SelectLocation from "../Step03_SelectLocation";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { fetchPopularPlants, fetchPlantSearchIndex } from "../../../../api/services/plant-definitions.service";
import { fetchUserLocations } from "../../../../api/services/locations.service";
import { useWizardImagePreload } from "../../hooks/useWizardImagePreload";

let mockLanguage = "en";
let mockImagesLoading = false;
let mockState: any;
const mockActions = { setSelectedPlant: jest.fn(), goTo: jest.fn(), addLocation: jest.fn(), selectLocation: jest.fn() };
const mockT = (key: string) => ({
  "createPlant.step01.title": "Select a plant",
  "createPlant.step03.title": "Choose a location",
} as Record<string, string>)[key] ?? key;

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: {} }) }));
jest.mock("../../../../app/providers/LanguageProvider", () => ({
  useLanguage: () => ({ currentLanguage: mockLanguage, changeLanguage: jest.fn() }),
}));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: any) => require("react").useEffect(() => callback(), [callback]),
}));
jest.mock("../../hooks/useCreatePlantWizard", () => ({ useCreatePlantWizard: () => ({ state: mockState, actions: mockActions }) }));
jest.mock("../../hooks/useWizardImagePreload", () => ({
  useWizardImagePreload: jest.fn(() => ({ loading: mockImagesLoading })),
}), { virtual: true });
jest.mock("../../../../api/services/plant-definitions.service", () => ({ fetchPopularPlants: jest.fn(), fetchPlantSearchIndex: jest.fn() }));
jest.mock("../../../../api/services/locations.service", () => ({ fetchUserLocations: jest.fn(), createLocation: jest.fn() }));
jest.mock("../../components/PlantSearchBox", () => (props: any) =>
  require("react").createElement(require("react-native").View, { ...props, testID: "plant-search" }));

const popular = [{ id: "1", name: "Snake plant", latin: "Dracaena trifasciata", image: "https://example.test/snake.jpg" }];
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const selectProps = () => ({ onScrollToTop: jest.fn(), onOpenScanner: jest.fn(), onRegisterScanResultHandler: jest.fn(), onReadyChange: jest.fn() });
const locationProps = () => ({ onOpenAddLocation: jest.fn(), onRegisterCreateHandler: jest.fn(), onReadyChange: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks(); mockLanguage = "en"; mockImagesLoading = false; mockState = { locations: [] };
  jest.spyOn(Animated, "loop").mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  (fetchPopularPlants as jest.Mock).mockResolvedValue(popular);
  (fetchPlantSearchIndex as jest.Mock).mockResolvedValue([]);
  (fetchUserLocations as jest.Mock).mockResolvedValue([]);
  mockActions.addLocation.mockImplementation((name: string, category: string, id: string) => {
    mockState.locations = [...mockState.locations, { name, category, id }];
  });
});
afterEach(() => { jest.restoreAllMocks(); });

it("shows only the shared spinner until both selection data and popular images are ready", async () => {
  const plants = deferred<typeof popular>(), search = deferred<any[]>();
  (fetchPopularPlants as jest.Mock).mockReturnValue(plants.promise);
  (fetchPlantSearchIndex as jest.Mock).mockReturnValue(search.promise);
  const props = selectProps(); const view = render(<Step01_SelectPlant {...props} />);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByText("Select a plant")).toBeNull();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(false);
  await act(async () => { plants.resolve(popular); });
  expect(view.queryByTestId("plant-search")).toBeNull();
  mockImagesLoading = true;
  await act(async () => { search.resolve([]); });
  expect(useWizardImagePreload).toHaveBeenLastCalledWith([popular[0].image], true);
  expect(view.queryByText("Snake plant")).toBeNull();
  mockImagesLoading = false; view.rerender(<Step01_SelectPlant {...props} />);
  expect(view.getByText("Select a plant")).toBeTruthy();
  expect(view.getByText("Snake plant")).toBeTruthy();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(true);
});

it("settles a failed selection request and reveals its existing error state", async () => {
  (fetchPopularPlants as jest.Mock).mockRejectedValueOnce(new Error("Catalogue offline"));
  const props = selectProps(); const view = render(<Step01_SelectPlant {...props} />);
  await waitFor(() => expect(view.getByText("Select a plant")).toBeTruthy());
  expect(view.getAllByText("Catalogue offline")).toHaveLength(2);
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(true);
});

it("hides the old selection card immediately while another language's data loads", async () => {
  const props = selectProps(); const view = render(<Step01_SelectPlant {...props} />);
  await view.findByText("Snake plant");
  const nextPlants = deferred<typeof popular>();
  (fetchPopularPlants as jest.Mock).mockReturnValueOnce(nextPlants.promise);
  mockLanguage = "pl"; view.rerender(<Step01_SelectPlant {...props} />);
  expect(view.queryByText("Snake plant")).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(false);
  await act(async () => { nextPlants.resolve(popular); });
  expect(view.getByText("Snake plant")).toBeTruthy();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(true);
});

it("waits for locations before revealing the full location card", async () => {
  const locations = deferred<Array<{ id: number; name: string; category: string }>>();
  (fetchUserLocations as jest.Mock).mockReturnValueOnce(locations.promise);
  const props = locationProps(); const view = render(<Step03_SelectLocation {...props} />);
  expect(view.queryByText("Choose a location")).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(false);
  await act(async () => { locations.resolve([{ id: 4, name: "Kitchen", category: "indoor" }]); });
  expect(view.getByText("Choose a location")).toBeTruthy();
  expect(view.getByText("Kitchen")).toBeTruthy();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(true);
});

it("reveals a usable location card after a failed request instead of holding the spinner", async () => {
  (fetchUserLocations as jest.Mock).mockRejectedValueOnce(new Error("Locations offline"));
  const props = locationProps(); const view = render(<Step03_SelectLocation {...props} />);
  await view.findByText("Locations offline");
  expect(view.getByText("Choose a location")).toBeTruthy();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(props.onReadyChange).toHaveBeenLastCalledWith(true);
});

it("does not merge a location response after its wizard step has unmounted", async () => {
  const locations = deferred<Array<{ id: number; name: string; category: string }>>();
  (fetchUserLocations as jest.Mock).mockReturnValueOnce(locations.promise);
  const view = render(<Step03_SelectLocation {...locationProps()} />);
  view.unmount();
  await act(async () => { locations.resolve([{ id: 4, name: "Kitchen", category: "indoor" }]); });
  expect(mockActions.addLocation).not.toHaveBeenCalled();
});
