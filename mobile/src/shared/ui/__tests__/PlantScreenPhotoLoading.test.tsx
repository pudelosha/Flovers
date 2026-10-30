import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import PlantsScreen from "../../../features/plants/pages/PlantsScreen";
import PlantDetailsScreen from "../../../features/plant-details/pages/PlantDetailsScreen";
import CenteredSpinner from "../CenteredSpinner";
import { usePlantPhotoPreload } from "../../hooks/usePlantPhotoPreload";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import { fetchPlantDetailsById } from "../../../api/services/plant-details.service";

const mockT = (key: string, values?: any) => values?.defaultValue ?? key;
const mockNavigation = { navigate: jest.fn(), setParams: jest.fn() };
let mockRoute: any = { params: {} };
let mockPhotoLoading = true;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useIsFocused: () => true,
  useFocusEffect: (callback: any) => require("react").useEffect(() => callback(), [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../../hooks/usePlantPhotoPreload", () => ({
  usePlantPhotoPreload: jest.fn(() => ({ loading: mockPhotoLoading, ready: !mockPhotoLoading })),
}));
jest.mock("../../../api/services/plant-instances.service", () => ({
  fetchPlantInstances: jest.fn(), fetchPlantInstanceForEdit: jest.fn(), updatePlantInstanceFromForm: jest.fn(), deletePlantInstance: jest.fn(),
}));
jest.mock("../../../api/services/plant-details.service", () => ({ fetchPlantDetailsById: jest.fn(), fetchPlantDetailsByQr: jest.fn() }));
jest.mock("../../utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn(async () => null) }));
jest.mock("react-native-fs", () => ({ DocumentDirectoryPath: "/documents" }));
jest.mock("@react-native-camera-roll/camera-roll", () => ({ CameraRoll: { save: jest.fn() } }));
jest.mock("../GlassHeader", () => (props: any) => require("react").createElement(require("react-native").Text, null, props.title));
jest.mock("../TopSnackbar", () => () => null);
jest.mock("../FAB", () => () => null);
jest.mock("../../../features/plants/components/PlantTile", () => (props: any) =>
  require("react").createElement(require("react-native").Text, { testID: "plant-tile" }, props.plant.name));
jest.mock("../../../features/plant-details/components/PlantInfoTile", () => (props: any) =>
  require("react").createElement(require("react-native").Text, { testID: "plant-details-tile" }, props.plant.display_name));
jest.mock("../../../features/plant-details/components/PlantLatestReadingsTile", () => () => null);
jest.mock("../../../features/plant-details/components/PlantRemindersTile", () => () => null);
jest.mock("../../../features/plant-details/components/PlantQrTile", () => () => null);
jest.mock("../../../features/plant-details/components/modals/PlantDefinitionModal", () => () => null);
jest.mock("../../../features/plant-details/components/modals/ChangePlantImageModal", () => () => null);
jest.mock("../../../features/plants/components/modals/EditPlantModal", () => () => null);
jest.mock("../../../features/plants/components/modals/ConfirmDeleteModal", () => () => null);
jest.mock("../../../features/plants/components/modals/PlantQrModal", () => () => null);
jest.mock("../../../features/plants/components/modals/PlantJournalModal", () => () => null);
jest.mock("../../../features/plants/components/modals/SortPlantsModal", () => () => null);
jest.mock("../../../features/plants/components/modals/FilterPlantsModal", () => () => null);
jest.mock("../../../features/home/components/modals/CompleteTaskModal", () => () => null);
jest.mock("../../../features/readings/components/modals/WateringScheduleModal", () => () => null);

const photo = { id: "photo-1", url: "/private-photo/", thumbnail_url: "/private-thumbnail/", width: 960, height: 1280,
  framing: { focal_x: 0.5, focal_y: 0.5, zoom: 2 }, byte_size: 90000 };
const plant = { id: 7, display_name: "Bird", photo, plant_definition: { id: 1, name: "Bird of paradise", image: "/catalogue.jpg" } };
beforeEach(() => {
  jest.clearAllMocks(); mockPhotoLoading = true; mockRoute = { params: {} };
  (fetchPlantInstances as jest.Mock).mockResolvedValue([plant]);
  (fetchPlantDetailsById as jest.Mock).mockResolvedValue({ plant, latestReadings: null, deviceLinked: false, sensors: {}, reminders: [] });
});

it("waits for the Plants screen's custom photo after plant metadata arrives", async () => {
  const view = render(<PlantsScreen />);
  await waitFor(() => expect(usePlantPhotoPreload).toHaveBeenLastCalledWith([
    { photo, variant: "display", expiresAt: undefined },
  ], true));
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByTestId("plant-tile")).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<PlantsScreen />);
  expect(view.getByTestId("plant-tile").props.children).toBe("Bird");
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});

it("waits for Plant Details photo bytes before showing any plant tile", async () => {
  mockRoute = { params: { id: 7 } };
  const view = render(<PlantDetailsScreen />);
  await waitFor(() => expect(usePlantPhotoPreload).toHaveBeenLastCalledWith([
    { photo, variant: "display", expiresAt: undefined },
  ], true, 0));
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByTestId("plant-details-tile")).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<PlantDetailsScreen />);
  expect(view.getByTestId("plant-details-tile").props.children).toBe("Bird");
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});
