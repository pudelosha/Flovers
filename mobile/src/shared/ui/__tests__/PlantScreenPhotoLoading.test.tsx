import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import FAB from "../FAB";
import SearchPlantsModal from "../../../features/plants/components/modals/SearchPlantsModal";
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
let mockNativeImageReady = false;
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
jest.mock("../../../features/plant-details/components/PlantInfoTile", () => (props: any) => {
  const React = require("react");
  React.useEffect(() => { props.onImageReadyChange?.(mockNativeImageReady); }, [props.onImageReadyChange, mockNativeImageReady]);
  return React.createElement(require("react-native").Text, { testID: "plant-details-tile" }, props.plant.display_name);
});
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
  jest.clearAllMocks(); mockPhotoLoading = true; mockNativeImageReady = false; mockRoute = { params: {} };
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

it("waits for Plant Details metadata, private bytes and native image decoding before showing the screen", async () => {
  mockRoute = { params: { id: 7 } };
  const view = render(<PlantDetailsScreen />);
  await waitFor(() => expect(usePlantPhotoPreload).toHaveBeenLastCalledWith([
    { photo, variant: "display", expiresAt: undefined },
  ], true, 0));
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByTestId("plant-details-tile")).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<PlantDetailsScreen />);
  expect(view.queryByTestId("plant-details-tile")).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  mockNativeImageReady = true;
  view.rerender(<PlantDetailsScreen />);
  expect(view.getByTestId("plant-details-tile").props.children).toBe("Bird");
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});


it("also waits for a definition image when the plant has no private photo", async () => {
  mockRoute = { params: { id: 7 } };
  mockPhotoLoading = false;
  (fetchPlantDetailsById as jest.Mock).mockResolvedValue({ plant: { ...plant, photo: null }, latestReadings: null, deviceLinked: false, sensors: {}, reminders: [] });
  const view = render(<PlantDetailsScreen />);
  await waitFor(() => expect(fetchPlantDetailsById).toHaveBeenCalled());
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.queryByTestId("plant-details-tile")).toBeNull();
  mockNativeImageReady = true;
  view.rerender(<PlantDetailsScreen />);
  expect(view.getByTestId("plant-details-tile")).toBeTruthy();
});

it("places Search second in Plants FAB and searches species while preserving the applied query on cancel",async()=>{
 mockPhotoLoading=false;
 (fetchPlantInstances as jest.Mock).mockResolvedValue([
  {id:1,display_name:"Bird",plant_definition:{id:1,name:"Bird of paradise",latin:"Strelitzia alba"},location:{id:1,name:"Living room"}},
  {id:2,display_name:"Pilea",plant_definition:{id:2,name:"Chinese money plant",latin:"Pilea peperomioides"},location:{id:2,name:"Kitchen"}},
 ]);
 const view=render(<PlantsScreen/>);await waitFor(()=>expect(view.getAllByTestId("plant-tile")).toHaveLength(2));
 const actions=view.UNSAFE_getByType(FAB).props.actions;expect(actions.slice(0,2).map((a:any)=>a.key)).toEqual(["create","search"]);
 act(()=>{actions[1].onPress();});expect(view.UNSAFE_getByType(SearchPlantsModal).props.visible).toBe(true);
 fireEvent.changeText(view.getByLabelText("Name, species or location"),"PARADISE living");fireEvent.press(view.getByText("Search"));
 await waitFor(()=>expect(view.getAllByTestId("plant-tile")).toHaveLength(1));expect(view.getByTestId("plant-tile").props.children).toBe("Bird");
 act(()=>{view.UNSAFE_getByType(FAB).props.actions[1].onPress();});
 fireEvent.changeText(view.getByLabelText("Name, species or location"),"Pilea");fireEvent.press(view.getByText("Cancel"));
 expect(view.getByTestId("plant-tile").props.children).toBe("Bird");
 fireEvent.press(view.getByLabelText("Clear search"));await waitFor(()=>expect(view.getAllByTestId("plant-tile")).toHaveLength(2));
});
