import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import UpsertReadingDeviceModal from "../UpsertReadingDeviceModal";

jest.mock("@react-native-clipboard/clipboard", () => ({ __esModule: true, default: { setString: jest.fn() } }));

const props = { visible: true, mode: "edit" as const, plants: [{ id: "1", name: "Fern" }], initialPlantId: "1",
  initialName: "Board", initialPumpIncluded: true, initialIntervalHours: 4, initialPumpCooldownMinutes: 90,
  onCancel: jest.fn(), onSave: jest.fn() };
beforeEach(() => jest.clearAllMocks());

it("loads legacy hours as minutes and saves exact minute intervals and cooldown", () => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  expect(view.getByTestId("reading-interval-minutes").props.value).toBe("240");
  fireEvent.changeText(view.getByLabelText("Reading interval (minutes)"), "45");
  fireEvent.changeText(view.getByLabelText("Automatic watering cooldown (minutes)"), "120");
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ intervalMinutes: 45, pumpCooldownMinutes: 120 }));
  expect(props.onSave.mock.calls[0][0]).not.toHaveProperty("intervalHours");
});
it.each(["", "0", "32768", "1.5", "1e3"])("blocks invalid cooldown %s without truncating it", (value) => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  fireEvent.changeText(view.getByLabelText("Automatic watering cooldown (minutes)"), value);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText("Enter a whole number from 1 to 32767.")).toBeTruthy();
});
it.each([1, 90, 1440])("loads and preserves valid minute interval %s", (intervalMinutes) => {
  const view = render(<UpsertReadingDeviceModal {...props} initialIntervalMinutes={intervalMinutes} />);
  expect(view.getByTestId("reading-interval-minutes").props.value).toBe(String(intervalMinutes));
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ intervalMinutes, pumpCooldownMinutes: 90 }));
});

it.each(["", "0", "1441", "1.5", "1e3", "-2"])("blocks invalid interval %s", (value) => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  fireEvent.changeText(view.getByLabelText("Reading interval (minutes)"), value);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText("Enter a whole number from 1 to 1440.")).toBeTruthy();
});

it("defaults a new device to 60 minutes", () => {
  const view = render(<UpsertReadingDeviceModal visible mode="add" onCancel={jest.fn()} onSave={jest.fn()} />);
  expect(view.getByTestId("reading-interval-minutes").props.value).toBe("60");
});

it("saves missing-reading email/push preferences independently of pump and moisture sensor", () => {
  const view = render(<UpsertReadingDeviceModal {...props} initialPumpIncluded={false}
    initialSensors={{ moisture: false }} />);
  fireEvent.press(view.getByRole("checkbox", { name: "Email me when readings are missing" }));
  fireEvent.press(view.getByRole("checkbox", { name: "Send a push notification when readings are missing" }));
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
    sendEmailMissingReadings: true, sendPushMissingReadings: true,
    sendEmailNotifications: false, sendPushNotifications: false, pumpIncluded: false,
  }));
});

it("loads and changes existing missing-reading preferences", () => {
  const view = render(<UpsertReadingDeviceModal {...props} initialSendEmailMissingReadings initialSendPushMissingReadings />);
  const email = view.getByRole("checkbox", { name: "Email me when readings are missing" });
  expect(email.props.accessibilityState.checked).toBe(true);
  fireEvent.press(email);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
    sendEmailMissingReadings: false, sendPushMissingReadings: true,
  }));
});
