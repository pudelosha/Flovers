import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import SharedPlantsScreen from "../SharedPlantsScreen";
import FAB from "../../../../shared/ui/FAB";
import ContactModalFrame from "../../components/ContactModalFrame";

const mockT = (_key: string, values: any = {}) => String(values.defaultValue ?? _key).replace(/{{(\w+)}}/g, (_, key) => String(values[key] ?? ""));
let mockSharing: any;
let mockFocused = true;
let mockFabPosition = "right";
let mockBottomInset = 0;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false, goBack: jest.fn() }),
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
    mockFocused = true;
    mockFabPosition = "right";
    mockBottomInset = 0;
    mockSharing = {
      contacts: [{ id: "anna", name: "Anna" }, { id: "bruno", name: "Bruno" }],
      shareDraft: null,
      shares: [
        { id: "s1", direction: "outgoing", plant: bird, contactId: "anna", canCompleteTasks: true },
        { id: "s2", direction: "outgoing", plant: bird, contactId: "bruno", canCompleteTasks: false },
        { id: "s3", direction: "incoming", plant: incomingPlant, contactId: "anna", canCompleteTasks: false },
      ],
      openSharePlant: jest.fn(), removeShare: jest.fn(), resetPreview: jest.fn(),
    };
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
    expect(view.getByText("Shared with Anna")).toBeTruthy();
    expect(view.getByText("Shared with Bruno")).toBeTruthy();
    expect(view.getByText("Shared by Anna")).toBeTruthy();
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
    expect(view.getByText("plus")).toBeTruthy();
  });

  it("leaves an incoming share without exposing owner management under its filter", async () => {
    const view = await renderScreen();
    selectFabAction(view, "Shared with me");
    expect(view.getByText("Shared by Anna")).toBeTruthy();
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
    selectFabAction(view, "Shared by me");
    expect(view.getByText("No plants shared yet")).toBeTruthy();
    selectFabAction(view, "Shared with me");
    expect(view.getByText("No plants shared with you")).toBeTruthy();
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
