import React from "react";
import { act, render } from "@testing-library/react-native";
import ResetWizardOnFocus from "../ResetWizardOnFocus";
import { useCreatePlantWizard } from "../../hooks/useCreatePlantWizard";

let mockFocus: () => void;
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => { mockFocus = callback; },
}));
jest.mock("../../hooks/useCreatePlantWizard", () => ({ useCreatePlantWizard: jest.fn() }));
const mockReset = jest.fn();
const mockWizard = useCreatePlantWizard as jest.Mock;

describe("wizard focus lifecycle", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("preserves a pending creation or photo retry across tab focus", () => {
    mockWizard.mockReturnValue({ state: { step: "creating", createdPlantId: "99" }, actions: { reset: mockReset } });
    render(<ResetWizardOnFocus />);
    act(() => { mockFocus(); });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("checks the latest step without resetting a creation when its state changes", () => {
    const actions = { reset: mockReset };
    mockWizard.mockReturnValue({ state: { step: "name" }, actions });
    const view = render(<ResetWizardOnFocus />);
    act(() => { mockFocus(); });
    expect(mockReset).toHaveBeenCalledTimes(1);
    mockReset.mockClear();

    mockWizard.mockReturnValue({ state: { step: "creating" }, actions });
    view.rerender(<ResetWizardOnFocus />);
    act(() => { mockFocus(); });
    expect(mockReset).not.toHaveBeenCalled();
  });
});
