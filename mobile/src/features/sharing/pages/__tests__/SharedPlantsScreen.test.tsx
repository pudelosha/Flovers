import React from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import SharedPlantsScreen from "../SharedPlantsScreen";
import FAB from "../../../../shared/ui/FAB";
import ContactModalFrame from "../../components/ContactModalFrame";
import GlassCard from "../../../profile/components/GlassCard";

const mockT = (_key: string, values: any = {}) => String(values.defaultValue ?? _key).replace(/{{(\w+)}}/g, (_, key) => String(values[key] ?? ""));
let mockSharing: any;
let mockFocused = true;
let mockFabPosition = "right";
let mockBottomInset = 0;
const mockNavigate = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
  useNavigation: () => ({ navigate: mockNavigate, canGoBack: () => false, goBack: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: mockBottomInset, left: 0, right: 0 }),
}));
jest.mock("../../../../app/providers/SettingsProvider", () => ({
  useSettings: () => ({ settings: { fabPosition: mockFabPosition } }),
}));
jest.mock("../../state/SharingPreviewProvider", () => ({ useSharingPreview: () => mockSharing }));
jest.mock("../../../../shared/utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn(async () => null) }));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));
jest.mock("react-native-linear-gradient", () => ({
  __esModule: true,
  default: (props: any) => require("react").createElement(require("react-native").View, props, props.children),
}));

const bird = { id: "1", name: "Bird", latin: "Strelitzia alba", location: "Living room", imageUrl: "https://example.test/bird.jpg" };
const incomingPlant = { id: "2", name: "Peace lily", latin: "Spathiphyllum", location: "Kitchen", previewImage: "peaceLily" };
async function renderScreen() {
  const view = render(<SharedPlantsScreen />);
  await act(async () => { await Promise.resolve(); });
  return view;
}
function fabLabels(view: ReturnType<typeof render>) {
  return view.UNSAFE_getByType(FAB).props.actions.map((action: any) => action.label);
}
function selectFabAction(view: ReturnType<typeof render>, label: string) {
  const action = view.UNSAFE_getByType(FAB).props.actions.find((item: any) => item.label === label);
  act(() => action.onPress());
}

describe("SharedPlantsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(View.prototype, "measureInWindow").mockImplementation(function (this: any, callback: any) {
      if (this.props.testID === "shared-plants-screen") callback(0, 0, 360, 780);
      else callback(300, 120, 36, 36);
    });
    mockFocused = true;
    mockFabPosition = "right";
    mockBottomInset = 0;
    mockSharing = {
      loaded: true, loading: false, error: null, pending: null, refresh: jest.fn(async () => ({})),
      contacts: [{ id: "anna", name: "Anna" }, { id: "bruno", name: "Bruno" }],
      versions: { "1": 3 },
      shareDraft: null,
      shares: [
        { id: "s1", direction: "outgoing", plant: bird, contactId: "anna", canCompleteTasks: true },
        { id: "s2", direction: "outgoing", plant: bird, contactId: "bruno", canCompleteTasks: false },
        { id: "s3", direction: "incoming", plant: incomingPlant, contactId: "anna", canCompleteTasks: false },
      ],
      openSharePlant: jest.fn(), removeShare: jest.fn(async () => ({ ok: true })),
      removePlantSharing: jest.fn(async () => ({ ok: true })), resetPreview: jest.fn(),
    };
  });
  afterEach(() => jest.restoreAllMocks());

  it("opens a floating plant menu and navigates to the selected plant", async () => {
    const view = await renderScreen();
    const tile = view.UNSAFE_getAllByType(GlassCard)[0];
    expect(view.queryByText("Plant details")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(view.getByRole("button", { name: "Go to plant" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Display tasks" })).toBeTruthy();
    expect(within(tile).queryByText("Go to plant", { includeHiddenElements: true })).toBeNull();
    expect(StyleSheet.flatten(view.getByTestId("shared-plant-actions-menu").props.style)).toMatchObject({
      position: "absolute", backgroundColor: "#000000", right: 30, shadowOpacity: 0,
    });
    fireEvent.press(view.getByRole("button", { name: "Go to plant" }));
    expect(mockNavigate).toHaveBeenCalledWith("PlantDetails", { id: "1" });
    expect(view.queryByTestId("shared-plant-actions-menu")).toBeNull();
  });

  it("opens Home filtered to the chosen received plant, including repeated requests", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Peace lily" }));
    fireEvent.press(view.getByRole("button", { name: "Display tasks" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("Home", { plantId: "2", filterRequestId: expect.any(String) });
    const firstRequest = mockNavigate.mock.calls[0][1].filterRequestId;
    fireEvent.press(view.getByRole("button", { name: "Actions for Peace lily" }));
    fireEvent.press(view.getByRole("button", { name: "Display tasks" }));
    expect(mockNavigate.mock.calls[1][1].filterRequestId).not.toBe(firstRequest);
  });

  it("closes the menu outside, on Android Back, and when a filter hides its tile", async () => {
    let onBack: any;
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, callback) => { onBack = callback; return { remove: jest.fn() }; });
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    fireEvent.press(view.getByRole("button", { name: "Close" }));
    expect(view.queryByTestId("shared-plant-actions-menu")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    act(() => expect(onBack()).toBe(true));
    expect(view.queryByTestId("shared-plant-actions-menu")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    selectFabAction(view, "Shared with me");
    expect(view.queryByTestId("shared-plant-actions-menu")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("defaults to all directions, uses image/Latin/location heroes and omits Back and inline controls", async () => {
    const view = await renderScreen();
    expect(view.getAllByText("Bird")).toHaveLength(1);
    expect(view.getByText("Peace lily")).toBeTruthy();
    expect(view.getByText("Strelitzia alba")).toBeTruthy();
    expect(view.getByText("Spathiphyllum")).toBeTruthy();
    expect(view.getByText("Living room")).toBeTruthy();
    expect(view.getByText("Kitchen")).toBeTruthy();
    expect(view.getAllByText("map-marker-outline")).toHaveLength(2);
    expect(view.queryByText("All shared plants")).toBeNull();
    expect(view.queryByText("Back")).toBeNull();
    expect(view.queryByText("Share plants")).toBeNull();
    expect(view.queryAllByRole("tab")).toHaveLength(0);
    expect(view.queryByText("Shared with Anna, Bruno")).toBeNull();
    expect(view.getAllByText("Anna")).toHaveLength(2);
    expect(view.getByText("Bruno")).toBeTruthy();
    expect(view.queryByText("Shared by Anna")).toBeNull();
    expect(view.getAllByText("Manage sharing")).toHaveLength(1);
    fireEvent.press(view.getByText("Manage sharing"));
    expect(mockSharing.openSharePlant).toHaveBeenCalledWith(bird);
  });

  it("adds scroll clearance so the final tile can move above the FAB", async () => {
    mockBottomInset = 16;
    const view = await renderScreen();
    const scroll = view.UNSAFE_getByType(ScrollView);
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(200);
  });

  it("puts Share plants first and replaces only the active FAB filter with Show all", async () => {
    const view = await renderScreen();
    expect(fabLabels(view)).toEqual(["Share plants", "Shared by me", "Shared with me"]);
    selectFabAction(view, "Shared by me");
    expect(fabLabels(view)).toEqual(["Share plants", "Show all", "Shared with me"]);
    expect(view.queryByText("Peace lily")).toBeNull();
    expect(view.getByText("Bird")).toBeTruthy();
    selectFabAction(view, "Shared with me");
    expect(fabLabels(view)).toEqual(["Share plants", "Shared by me", "Show all"]);
    expect(view.queryByText("Bird")).toBeNull();
    expect(view.getByText("Peace lily")).toBeTruthy();
    selectFabAction(view, "Show all");
    expect(fabLabels(view)).toEqual(["Share plants", "Shared by me", "Shared with me"]);
    expect(view.getByText("Bird")).toBeTruthy();
    expect(view.getByText("Peace lily")).toBeTruthy();
    expect(view.queryByText("All shared plants")).toBeNull();
    selectFabAction(view, "Share plants");
    expect(mockSharing.openSharePlant).toHaveBeenCalledWith();
  });

  it("honors FAB position and closes its actions when sharing opens or the screen blurs", async () => {
    mockFabPosition = "left";
    const view = await renderScreen();
    expect(view.UNSAFE_getByType(FAB).props.position).toBe("left");
    fireEvent.press(view.getByText("plus"));
    expect(view.getByText("Share plants")).toBeTruthy();
    mockSharing.shareDraft = {};
    view.rerender(<SharedPlantsScreen />);
    expect(view.queryByText("Share plants")).toBeNull();
    expect(view.queryByText("plus")).toBeNull();
    mockSharing.shareDraft = null;
    view.rerender(<SharedPlantsScreen />);
    expect(view.getByText("plus")).toBeTruthy();
    expect(view.queryByText("Share plants")).toBeNull();
    fireEvent.press(view.getByText("plus"));
    mockFocused = false;
    view.rerender(<SharedPlantsScreen />);
    expect(view.queryByText("plus")).toBeNull();
    mockFocused = true;
    view.rerender(<SharedPlantsScreen />);
    expect(view.getByText("plus")).toBeTruthy();
    expect(view.queryByText("Share plants")).toBeNull();
  });

  it("keeps incoming and outgoing groups separate even when plant ids match", async () => {
    mockSharing.shares[2].plant = { ...incomingPlant, id: bird.id };
    const view = await renderScreen();
    expect(view.getByText("Bird")).toBeTruthy();
    expect(view.getByText("Peace lily")).toBeTruthy();
    expect(view.getAllByText("Manage sharing")).toHaveLength(1);
    expect(view.getByLabelText("Remove access: Anna")).toBeTruthy();
    expect(view.getByLabelText("Leave shared plant: Peace lily")).toBeTruthy();
  });

  it("requires confirmation and removes only the chosen outgoing recipient while All is active", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByLabelText("Remove access: Bruno"));
    expect(mockSharing.removeShare).not.toHaveBeenCalled();
    expect(view.getByText("Bruno will no longer have access to Bird.")).toBeTruthy();
    expect(view.UNSAFE_getByType(ContactModalFrame).props.visible).toBe(true);
    expect(view.queryByText("plus")).toBeNull();
    fireEvent.press(view.getByText("Remove access"));
    expect(mockSharing.removeShare).toHaveBeenCalledWith("s2");
    await view.findByText("plus");
  });

  it("confirms removal of every recipient for one plant without deleting the plant", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    fireEvent.press(view.getByRole("button", { name: "Delete sharing" }));
    expect(view.queryByTestId("shared-plant-actions-menu")).toBeNull();
    expect(view.getByText("Delete sharing?")).toBeTruthy();
    expect(view.getByText("Everyone you shared Bird with will lose access. Your plant and its data will be kept.")).toBeTruthy();
    expect(mockSharing.removePlantSharing).not.toHaveBeenCalled();
    expect(view.queryByText("plus")).toBeNull();
    // A background refresh must not silently change the revision being confirmed.
    mockSharing.versions = { "1": 4 };
    view.rerender(<SharedPlantsScreen />);
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Delete sharing" })); });
    expect(mockSharing.removePlantSharing).toHaveBeenCalledWith(bird, 3);
    expect(mockSharing.removeShare).not.toHaveBeenCalled();
    expect(view.queryByText("Delete sharing?")).toBeNull();
    expect(view.getByText("Bird")).toBeTruthy();
  });

  it("cancels deleting all sharing and keeps the current recipient list", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    fireEvent.press(view.getByRole("button", { name: "Delete sharing" }));
    fireEvent.press(view.getByRole("button", { name: "Cancel" }));
    expect(mockSharing.removePlantSharing).not.toHaveBeenCalled();
    expect(view.queryByText("Delete sharing?")).toBeNull();
    expect(view.getByText("Bruno")).toBeTruthy();
  });

  it("does not offer deleting all sharing to a recipient", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Peace lily" }));
    expect(view.getByRole("button", { name: "Go to plant" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Delete sharing" })).toBeNull();
  });

  it("keeps the all-recipient confirmation open on conflict and disables it while pending", async () => {
    mockSharing.removePlantSharing.mockResolvedValue({ ok: false, reason: "conflict" });
    const view = await renderScreen();
    fireEvent.press(view.getByRole("button", { name: "Actions for Bird" }));
    fireEvent.press(view.getByRole("button", { name: "Delete sharing" }));
    mockSharing.pending = "remove-plant:1";
    view.rerender(<SharedPlantsScreen />);
    expect(view.getByRole("button", { name: "Delete sharing" }).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(view.getByRole("button", { name: "Delete sharing" }));
    expect(mockSharing.removePlantSharing).not.toHaveBeenCalled();
    mockSharing.pending = null;
    view.rerender(<SharedPlantsScreen />);
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Delete sharing" })); });
    expect(view.getByText("Delete sharing?")).toBeTruthy();
    expect(view.getByText("Sharing changed elsewhere. Reload and try again.")).toBeTruthy();
    expect(view.getByText("Bruno", { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByRole("button", { name: "Delete sharing" }).props.accessibilityState.disabled).toBe(true);
    mockSharing.refresh.mockResolvedValueOnce({ shares: mockSharing.shares, versions: { "1": 4 } });
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Reload sharing" })); });
    expect(view.queryByText("Sharing changed elsewhere. Reload and try again.")).toBeNull();
    mockSharing.removePlantSharing.mockResolvedValue({ ok: true });
    await act(async () => { fireEvent.press(view.getByRole("button", { name: "Delete sharing" })); });
    expect(mockSharing.removePlantSharing).toHaveBeenLastCalledWith(bird, 4);
    expect(view.queryByText("Delete sharing?")).toBeNull();
  });

  it("leaves an incoming share without exposing owner management under its filter", async () => {
    const view = await renderScreen();
    selectFabAction(view, "Shared with me");
    expect(view.getByText("Anna")).toBeTruthy();
    expect(view.queryByText("Manage sharing")).toBeNull();
    fireEvent.press(view.getByLabelText("Leave shared plant: Peace lily"));
    expect(view.UNSAFE_getByType(ContactModalFrame).props.visible).toBe(true);
    fireEvent.press(view.getByText("Leave shared plant"));
    expect(mockSharing.removeShare).toHaveBeenCalledWith("s3");
  });

  it("cancels a leave confirmation without removing access or changing the list", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByLabelText("Leave shared plant: Peace lily"));
    expect(view.getByText("Leave shared plant?")).toBeTruthy();
    fireEvent.press(view.getByText("Cancel"));
    expect(mockSharing.removeShare).not.toHaveBeenCalled();
    expect(view.queryByText("Leave shared plant?")).toBeNull();
    expect(view.getByText("Peace lily")).toBeTruthy();
    expect(view.getByText("plus")).toBeTruthy();
  });

  it("shows empty states for All, outgoing and incoming filters", async () => {
    mockSharing.shares = [];
    const view = await renderScreen();
    expect(view.getByText("No shared plants yet")).toBeTruthy();
    expect(view.getByTestId("shared-plants-empty")).toBeTruthy();
    selectFabAction(view, "Shared by me");
    expect(view.getByText("No plants shared yet")).toBeTruthy();
    selectFabAction(view, "Shared with me");
    expect(view.getByText("No plants shared with you")).toBeTruthy();
  });

  it("waits for real sharing data and exposes retry instead of sample tiles on failure", async () => {
    mockSharing.loaded = false; mockSharing.loading = true;
    const view = await renderScreen();
    expect(view.queryByText("Bird")).toBeNull(); expect(view.UNSAFE_queryAllByType(FAB)).toHaveLength(0);
    mockSharing.loading = false; mockSharing.error = "unavailable";
    view.rerender(<SharedPlantsScreen />);
    expect(view.getByText("Could not load shared plants.")).toBeTruthy();
    fireEvent.press(view.getByText("Try again")); expect(mockSharing.refresh).toHaveBeenCalled();
  });

  it("keeps the leave confirmation and shared plant after a server failure", async () => {
    mockSharing.removeShare.mockResolvedValue({ ok: false, reason: "unavailable" });
    const view = await renderScreen();
    fireEvent.press(view.getByLabelText("Leave shared plant: Peace lily"));
    await act(async () => { fireEvent.press(view.getByText("Leave shared plant")); });
    expect(view.getByText("Leave shared plant?")).toBeTruthy();
    expect(view.getByText("Could not load or update sharing. Please try again.")).toBeTruthy();
    expect(view.getByText("Peace lily", { includeHiddenElements: true })).toBeTruthy();
  });

  it("closes a confirmation on blur and keeps it closed when returning", async () => {
    const view = await renderScreen();
    fireEvent.press(view.getByLabelText("Remove access: Anna"));
    expect(view.getByText("Remove access?")).toBeTruthy();
    mockFocused = false;
    view.rerender(<SharedPlantsScreen />);
    expect(view.queryByText("Remove access?")).toBeNull();
    mockFocused = true;
    view.rerender(<SharedPlantsScreen />);
    expect(view.queryByText("Remove access?")).toBeNull();
    expect(mockSharing.removeShare).not.toHaveBeenCalled();
  });
});
