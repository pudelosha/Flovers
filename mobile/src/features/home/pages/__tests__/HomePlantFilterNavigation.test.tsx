import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import HomeScreen from "../HomeScreen";
import FilterHomeTasksModal from "../../components/modals/FilterHomeTasksModal";
import FAB from "../../../../shared/ui/FAB";
import { fetchHomeTasks } from "../../../../api/services/home.service";

let mockFocused = true;
let mockParams: any;
const mockNavigation = { navigate: jest.fn(), setParams: jest.fn() };
const mockT = (key: string, options: any = {}) => options.defaultValue ?? key;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ name: "Home", key: "home-route", params: mockParams }),
  useIsFocused: () => mockFocused,
  useFocusEffect: (callback: any) => require("react").useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]),
}));
jest.mock("../../../../app/providers/SettingsProvider", () => ({ useSettings: () => ({ settings: { fabPosition: "right" } }) }));
jest.mock("../../../../api/services/home.service", () => ({ fetchHomeTasks: jest.fn(), markHomeTaskComplete: jest.fn() }));
jest.mock("../../components/TaskTile", () => (props: any) => require("react").createElement(require("react-native").Text, { testID: `task-${props.task.id}` }, props.task.plant));
jest.mock("../../components/modals/FilterHomeTasksModal", () => () => null);
jest.mock("../../components/modals/SortHomeTasksModal", () => () => null);
jest.mock("../../components/modals/CompleteTaskModal", () => () => null);
jest.mock("../../../../shared/ui/GlassHeader", () => () => null);
jest.mock("../../../../shared/ui/TopSnackbar", () => () => null);
jest.mock("../../../../shared/ui/FAB", () => () => null);

const tasks = () => {
  const today = new Date(); const future = new Date(); future.setDate(today.getDate() + 5);
  return [
    { id: "a", plantId: "1", plant: "Bird task", type: "care", location: "Living room", dueDate: future, reminderId: "11" },
    { id: "b", plantId: "2", plant: "Pilea task", type: "watering", location: "Kitchen", dueDate: today, reminderId: "12" },
  ];
};
const allFilters = { plantId: undefined, location: undefined, types: [], dueFrom: "", dueTo: "" };
const filterProps = (view: ReturnType<typeof render>) => view.UNSAFE_getByType(FilterHomeTasksModal).props;
function applyFilters(view: ReturnType<typeof render>, value: any) { act(() => filterProps(view).onApply(value)); }
function requestPlant(view: ReturnType<typeof render>, plantId: string, filterRequestId?: string) {
  mockParams = { plantId, filterRequestId }; view.rerender(<HomeScreen />);
}

describe("Home navigation from shared plants", () => {
  beforeEach(() => {
    jest.clearAllMocks(); mockFocused = true; mockParams = undefined;
    mockNavigation.setParams.mockImplementation((params) => { mockParams = { ...mockParams, ...params }; });
    (fetchHomeTasks as jest.Mock).mockResolvedValue(tasks());
  });

  it("filters the first load to the requested plant and consumes the navigation request", async () => {
    mockParams = { plantId: "1", filterRequestId: "first" };
    const view = render(<HomeScreen />); await view.findByText("Bird task");
    expect(view.queryByText("Pilea task")).toBeNull();
    expect(filterProps(view).filters).toEqual({ ...allFilters, plantId: "1" });
    expect(filterProps(view).visible).toBe(false);
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ plantId: undefined, filterRequestId: undefined });
  });

  it("replaces conflicting manual and due-today filters on an already mounted Home screen", async () => {
    const view = render(<HomeScreen />); await view.findByText("Pilea task");
    applyFilters(view, { plantId: "2", location: "Kitchen", types: ["watering"], dueFrom: "2000-01-01", dueTo: "2099-12-31" });
    act(() => view.UNSAFE_getByType(FAB).props.actions.find((action: any) => action.key === "dueToday").onPress());
    expect(view.queryByText("Bird task")).toBeNull();
    requestPlant(view, "1", "second"); await view.findByText("Bird task");
    expect(view.queryByText("Pilea task")).toBeNull();
    expect(filterProps(view).filters).toEqual({ ...allFilters, plantId: "1" });
    expect(view.UNSAFE_getByType(FAB).props.actions.some((action: any) => action.key === "dueToday")).toBe(true);
  });

  it("can apply the same plant again after an earlier request was consumed", async () => {
    mockParams = { plantId: "1" }; const view = render(<HomeScreen />); await view.findByText("Bird task");
    applyFilters(view, { ...allFilters, plantId: "2" }); await view.findByText("Pilea task");
    requestPlant(view, "1"); await view.findByText("Bird task");
    expect(view.queryByText("Pilea task")).toBeNull();
    expect(mockNavigation.setParams).toHaveBeenCalledTimes(2);
  });

  it("waits for Home focus before consuming a pending plant request", async () => {
    mockFocused = false; mockParams = { plantId: "1" }; const view = render(<HomeScreen />);
    expect(mockNavigation.setParams).not.toHaveBeenCalled();
    mockFocused = true; view.rerender(<HomeScreen />); await view.findByText("Bird task");
    expect(mockNavigation.setParams).toHaveBeenCalledTimes(1);
  });

  it("keeps manual filters on a normal return without new navigation parameters", async () => {
    const view = render(<HomeScreen />); await view.findByText("Pilea task");
    const manual = { ...allFilters, location: "Kitchen", types: ["watering"] }; applyFilters(view, manual);
    mockFocused = false; view.rerender(<HomeScreen />); mockFocused = true; view.rerender(<HomeScreen />);
    await view.findByText("Pilea task"); expect(view.queryByText("Bird task")).toBeNull();
    expect(filterProps(view).filters).toEqual(manual); expect(mockNavigation.setParams).not.toHaveBeenCalled();
  });

  it("retains the newest plant request while the original data load is pending", async () => {
    let finish: any; (fetchHomeTasks as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    mockParams = { plantId: "1" }; const view = render(<HomeScreen />); requestPlant(view, "2");
    await act(async () => { finish(tasks()); }); await view.findByText("Pilea task");
    expect(view.queryByText("Bird task")).toBeNull(); expect(filterProps(view).filters.plantId).toBe("2");
  });

  it("ignores malformed empty requests without opening the filter modal", async () => {
    mockParams = { plantId: "   " }; const view = render(<HomeScreen />); await view.findByText("Pilea task");
    expect(view.getByText("Bird task")).toBeTruthy(); expect(filterProps(view).visible).toBe(false);
    expect(mockNavigation.setParams).not.toHaveBeenCalled();
  });
});
