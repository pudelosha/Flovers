import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import UpsertReadingDeviceModal from "../UpsertReadingDeviceModal";

jest.mock("@react-native-clipboard/clipboard", () => ({ __esModule: true, default: { setString: jest.fn() } }));

const props = { visible: true, mode: "edit" as const, plants: [{ id: "1", name: "Fern" }], initialPlantId: "1",
  initialName: "Board", initialPumpIncluded: true, initialIntervalHours: 4, initialPumpCooldownMinutes: 90,
  onCancel: jest.fn(), onSave: jest.fn() };
beforeEach(() => jest.clearAllMocks());

it("loads and saves the sampling interval and server-controlled cooldown", () => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  expect(view.getByTestId("reading-interval-hours").props.children).toBe(4);
  fireEvent.press(view.getByRole("button", { name: "Increase reading interval" }));
  fireEvent.changeText(view.getByLabelText("Automatic watering cooldown (minutes)"), "120");
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ intervalHours: 5, pumpCooldownMinutes: 120 }));
});
it.each(["", "0", "32768", "1.5", "1e3"])("blocks invalid cooldown %s without truncating it", (value) => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  fireEvent.changeText(view.getByLabelText("Automatic watering cooldown (minutes)"), value);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText("Enter a whole number from 1 to 32767.")).toBeTruthy();
});
it("bounds the hour stepper and preserves an unchanged cooldown", () => {
  const view = render(<UpsertReadingDeviceModal {...props} initialIntervalHours={24} />);
  fireEvent.press(view.getByRole("button", { name: "Increase reading interval" }));
  expect(view.getByTestId("reading-interval-hours").props.children).toBe(24);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ intervalHours: 24, pumpCooldownMinutes: 90 }));
});
