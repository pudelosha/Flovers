import React from "react";
import { act, render } from "@testing-library/react-native";
import TaskHistoryScreen from "../TaskHistoryScreen";
import TaskHistoryTile from "../../components/TaskHistoryTile";
import JournalPhotoTile from "../../components/JournalPhotoTile";
import JournalPhotoModal from "../../components/modals/JournalPhotoModal";
import FilterHistoryTasksModal from "../../components/modals/FilterHistoryTasksModal";
import SendHistoryExportModal from "../../components/modals/SendHistoryExportModal";
import DeleteHistoryTasksModal from "../../components/modals/DeleteHistoryTasksModal";
import ConfirmDeleteJournalPhotoModal from "../../components/modals/ConfirmDeleteJournalPhotoModal";
import FAB from "../../../../shared/ui/FAB";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { fetchHistoryItems, sendHistoryExportEmail } from "../../../../api/services/history.service";
import { fetchPlantInstances } from "../../../../api/services/plant-instances.service";
import { deleteJournalPhoto } from "../../../../api/services/journal-photos.service";

const mockT = (key: string, options: any = {}) => options.defaultValue || key;
const mockNavigate = jest.fn();
let mockRoute: any = {};
let mockPhotoLoading = false;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT, i18n: { language: "en" } }) }));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockRoute,
  useFocusEffect: (callback: any) => require("react").useEffect(callback, [callback]),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("react-native-linear-gradient", () => ({
  __esModule: true,
  default: (props: any) => require("react").createElement(require("react-native").View, props, props.children),
}));
jest.mock("../../../../api/services/history.service", () => ({
  fetchHistoryItems: jest.fn(), deleteHistoryEntry: jest.fn(), bulkDeleteHistoryEntries: jest.fn(), sendHistoryExportEmail: jest.fn(),
}));
jest.mock("../../../../api/services/plant-instances.service", () => ({ fetchPlantInstances: jest.fn() }));
jest.mock("../../../../api/services/journal-photos.service", () => ({ deleteJournalPhoto: jest.fn() }));
jest.mock("../../../../shared/hooks/usePlantPhotoPreload", () => ({
  usePlantPhotoPreload: () => ({ loading: mockPhotoLoading, ready: !mockPhotoLoading }),
}));
jest.mock("../../../../shared/ui/TopSnackbar", () => jest.fn(() => null));
jest.mock("../../components/TaskHistoryTile", () => jest.fn(() => null));
jest.mock("../../components/JournalPhotoTile", () => jest.fn(() => null));
jest.mock("../../components/modals/JournalPhotoModal", () => jest.fn(() => null));
jest.mock("../../components/modals/SortHistoryTasksModal", () => jest.fn(() => null));
jest.mock("../../components/modals/FilterHistoryTasksModal", () => jest.fn(() => null));
jest.mock("../../components/modals/DeleteHistoryTasksModal", () => jest.fn(() => null));
jest.mock("../../components/modals/SendHistoryExportModal", () => jest.fn(() => null));

const owner = { is_owner: true, is_shared: false, can_edit: true, can_complete_tasks: true,
  owner: { id: "1", name: "Owner" }, expires_at: null };
const viewer = { ...owner, is_owner: false, is_shared: true, can_edit: false };
const task = { id: "5", plantId: "9", plant: "Bird", location: "Kitchen", type: "watering", completedAt: "2026-10-30T10:00:00Z", access: owner };
const photo = { id: "5", entryKind: "photo", plantId: "9", plant: "Bird", location: "Kitchen", type: "photo",
  completedAt: "2026-10-31T10:00:00Z", createdAt: "2026-10-31T10:00:00Z", recordedDate: "", revision: 1,
  photo: { id: "private-photo" }, access: owner };

async function renderScreen() {
  const view = render(<TaskHistoryScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return view;
}
function actions(view: ReturnType<typeof render>) {
  return view.UNSAFE_getByType(FAB).props.actions;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute = {};
  mockPhotoLoading = false;
  (fetchHistoryItems as jest.Mock).mockResolvedValue([task, photo]);
  (fetchPlantInstances as jest.Mock).mockResolvedValue([{ id: 9, display_name: "Bird", access: owner }]);
  (deleteJournalPhoto as jest.Mock).mockResolvedValue(undefined);
});

it("renders both entry kinds even when their numeric identifiers match and filters photos without task actions", async () => {
  const view = await renderScreen();
  expect(view.UNSAFE_getAllByType(TaskHistoryTile)).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(JournalPhotoTile)).toHaveLength(1);
  expect(actions(view)[0].key).toBe("addPhoto");
  act(() => view.UNSAFE_getByType(FilterHistoryTasksModal).props.onApply({ types: ["photo"] }));
  expect(view.UNSAFE_queryByType(TaskHistoryTile)).toBeNull();
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
  expect(actions(view).map((action: any) => action.key)).not.toEqual(expect.arrayContaining(["sendExport", "delete"]));
});

it("strips Photo from task exports when both kinds are selected", async () => {
  const view = await renderScreen();
  act(() => view.UNSAFE_getByType(FilterHistoryTasksModal).props.onApply({ types: ["photo", "watering"] }));
  act(() => actions(view).find((action: any) => action.key === "sendExport").onPress());
  const modal = view.UNSAFE_getByType(SendHistoryExportModal);
  expect(modal.props.effectiveFilters.types).toEqual(["watering"]);
  await act(async () => { await modal.props.onSend(false); });
  expect(sendHistoryExportEmail).toHaveBeenCalledWith(expect.objectContaining({ types: ["watering"], includePending: false }));
});

it("does not offer photo-only plants or locations in bulk task deletion", async () => {
  (fetchHistoryItems as jest.Mock).mockResolvedValue([task, { ...photo, plantId: "10", plant: "Fern", location: "Bedroom" }]);
  const view = await renderScreen();
  const modal = view.UNSAFE_getByType(DeleteHistoryTasksModal);
  expect(modal.props.plantOptions).toEqual([{ id: "9", name: "Bird" }]);
  expect(modal.props.locationOptions).toEqual(["Kitchen"]);
});

it("lets an owned plant with no previous tasks or photos receive its first journal photo", async () => {
  mockRoute = { params: { plantId: "9" } };
  (fetchHistoryItems as jest.Mock).mockResolvedValue([]);
  const view = await renderScreen();
  act(() => actions(view)[0].onPress());
  const modal = view.UNSAFE_getByType(JournalPhotoModal);
  expect(modal.props.visible).toBe(true);
  expect(modal.props.entry).toBeNull();
  expect(modal.props.preferredPlantId).toBe("9");
  expect(modal.props.plantOptions).toEqual([expect.objectContaining({ id: "9", name: "Bird" })]);
  expect(view.UNSAFE_queryByType(FAB)).toBeNull();
});

it("keeps the journal hidden until its private photo bytes are ready", async () => {
  mockPhotoLoading = true;
  const view = await renderScreen();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.UNSAFE_queryByType(JournalPhotoTile)).toBeNull();
  expect(view.UNSAFE_queryByType(FAB)).toBeNull();
  mockPhotoLoading = false;
  view.rerender(<TaskHistoryScreen />);
  expect(view.UNSAFE_getByType(JournalPhotoTile)).toBeTruthy();
});

it("keeps shared photos viewable while denying add, edit and delete", async () => {
  (fetchHistoryItems as jest.Mock).mockResolvedValue([{ ...photo, access: viewer }]);
  (fetchPlantInstances as jest.Mock).mockResolvedValue([{ id: 9, display_name: "Bird", access: viewer }]);
  const view = await renderScreen();
  expect(actions(view).some((action: any) => action.key === "addPhoto")).toBe(false);
  const tile = view.UNSAFE_getByType(JournalPhotoTile);
  act(() => { tile.props.onEdit(); tile.props.onDelete(); });
  expect(view.UNSAFE_getByType(JournalPhotoModal).props.visible).toBe(false);
  expect(view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal).props.visible).toBe(false);
  act(() => tile.props.onPlantDetails());
  expect(mockNavigate).toHaveBeenCalledWith("PlantDetails", { id: "9" });
});

it.each(["route", "filter"])("hides Add photo for an incoming shared plant selected by %s even when another plant is owned", async (mode) => {
  if (mode === "route") mockRoute = { params: { plantId: "9" } };
  (fetchHistoryItems as jest.Mock).mockResolvedValue([{ ...photo, access: viewer }]);
  (fetchPlantInstances as jest.Mock).mockResolvedValue([
    { id: 9, display_name: "Bird", access: viewer },
    { id: 10, display_name: "Fern", access: owner },
  ]);
  const view = await renderScreen();
  if (mode === "filter") {
    expect(actions(view).some((action: any) => action.key === "addPhoto")).toBe(true);
    act(() => view.UNSAFE_getByType(FilterHistoryTasksModal).props.onApply({ plantId: "9" }));
  }
  expect(actions(view).some((action: any) => action.key === "addPhoto")).toBe(false);
});

it("asks before deleting a photo and sends its revision-bearing item to the dedicated API", async () => {
  const view = await renderScreen();
  act(() => view.UNSAFE_getByType(JournalPhotoTile).props.onDelete());
  expect(deleteJournalPhoto).not.toHaveBeenCalled();
  const confirm = view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal);
  expect(confirm.props.visible).toBe(true);
  await act(async () => { await confirm.props.onConfirm(); });
  expect(deleteJournalPhoto).toHaveBeenCalledWith(photo);
  expect(view.UNSAFE_getByType(ConfirmDeleteJournalPhotoModal).props.visible).toBe(false);
});
