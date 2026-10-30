import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import Step09_Creating from "../Step09_Creating";
import { useCreatePlantWizard } from "../../hooks/useCreatePlantWizard";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";

const mockNavigation = { navigate: jest.fn() };
jest.mock("@react-navigation/native", () => ({ useNavigation: () => mockNavigation }));
jest.mock("../../hooks/useCreatePlantWizard", () => ({ useCreatePlantWizard: jest.fn() }));
jest.mock("lottie-react-native", () => "LottieView");

const mockCreate = jest.fn();
const mockGoTo = jest.fn();
const mockReset = jest.fn();
const mockWizard = useCreatePlantWizard as jest.Mock;

describe("creating step recovery controls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCreate.mockReset();
    mockWizard.mockReturnValue({ state: {}, actions: { createPlant: mockCreate, goTo: mockGoTo, reset: mockReset } });
  });
  afterEach(() => { jest.useRealTimers(); });

  it("shows only the shared spinner until creation and photo upload finish", async () => {
    let finish!: (value: string) => void;
    mockCreate.mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve; }));
    const ready = jest.fn();
    const view = render(<Step09_Creating onReadyChange={ready} />);
    expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
    expect(view.queryByText("creating new plant")).toBeNull();
    expect(view.queryByText("plant created successfully")).toBeNull();
    expect(ready).toHaveBeenLastCalledWith(false);
    await act(async () => { finish("99"); });
    expect(view.UNSAFE_queryAllByType(CenteredSpinner)).toHaveLength(0);
    expect(view.getByText("plant created successfully")).toBeTruthy();
    expect(ready).toHaveBeenLastCalledWith(true);
    view.unmount();
  });

  it("shows a retry after failure and navigates only after a successful retry", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce("99");
    const view = render(<Step09_Creating />);
    await waitFor(() => expect(view.getByText("Could not create your plant. Please try again.")).toBeTruthy());
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(view.getByText("plant created successfully")).toBeTruthy());
    await act(async () => { jest.advanceTimersByTime(2500); });
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Plants");
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("lets the user return to their inputs after a failed creation", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Invalid location"));
    const view = render(<Step09_Creating />);
    await waitFor(() => expect(view.getByRole("button", { name: "Back" })).toBeTruthy());
    fireEvent.press(view.getByRole("button", { name: "Back" }));
    expect(mockGoTo).toHaveBeenCalledWith("name");
  });

  it("explains a photo-only failure and allows opening the created plant list", async () => {
    mockWizard.mockReturnValue({ state: { createdPlantId: "99" }, actions: { createPlant: mockCreate, goTo: mockGoTo, reset: mockReset } });
    mockCreate.mockRejectedValueOnce(new Error("Storage full"));
    const view = render(<Step09_Creating />);
    await waitFor(() => expect(view.getByText("Your plant was created, but its photo could not be uploaded. Try again to upload it without creating another plant.")).toBeTruthy());
    fireEvent.press(view.getByRole("button", { name: "Go to plants" }));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Plants");
    expect(mockGoTo).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
