import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import UpsertReadingDeviceModal from "../UpsertReadingDeviceModal";

jest.mock("@react-native-clipboard/clipboard", () => ({ __esModule: true, default: { setString: jest.fn() } }));

const props = { visible: true, mode: "edit" as const, plants: [{ id: "1", name: "Fern" }], initialPlantId: "1",
  initialName: "Board", initialPumpIncluded: true,
  onCancel: jest.fn(), onSave: jest.fn() };
beforeEach(() => jest.clearAllMocks());

it("keeps runtime settings out of Add/Edit and omits them from saves", () => {
  const view = render(<UpsertReadingDeviceModal {...props} />);
  expect(view.queryByTestId("reading-interval-minutes")).toBeNull();
  expect(view.queryByLabelText("Pump run time (seconds)")).toBeNull();
  expect(view.queryByLabelText("Automatic watering cooldown (minutes)")).toBeNull();
  fireEvent.press(view.getByText("readingsModals.common.save"));
  const payload = props.onSave.mock.calls[0][0];
  expect(payload).not.toHaveProperty("intervalMinutes");
  expect(payload).not.toHaveProperty("pumpCooldownMinutes");
  expect(payload).not.toHaveProperty("pumpDurationSeconds");
  expect(payload).toEqual(expect.objectContaining({ name: "Board", plantId: "1" }));
});

it("requires a plant and non-empty name before creating a device", () => {
  const onSave = jest.fn();
  const view = render(<UpsertReadingDeviceModal visible mode="add" onCancel={jest.fn()} onSave={onSave} />);
  fireEvent.press(view.getByText("readingsModals.common.save"));
  expect(onSave).not.toHaveBeenCalled();
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


