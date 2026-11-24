import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import ContactDetailsModal from "../ContactDetailsModal";

let mockSharing: any, mockContacts: any;
jest.mock("../../state/SharingPreviewProvider", () => ({ useSharingPreview: () => mockSharing }));
jest.mock("../../state/ContactsProvider", () => ({ useContacts: () => mockContacts }));
jest.mock("../SharingUI", () => {
  const React = require("react"), { Pressable, Text } = require("react-native");
  return { sharingStyles: {}, SharingButton: ({ label, onPress, disabled }: any) => <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}><Text>{label}</Text></Pressable> };
});
const contact = { id: "2", name: "Mom", email: "mom@example.test", floversId: `FL-${"2".repeat(32)}` };
beforeEach(() => {
  mockContacts = { updateContactName: jest.fn().mockResolvedValue({ ok: true }), pending: null };
  mockSharing = { loaded: true, loading: false, error: null, refresh: jest.fn().mockResolvedValue({}), openSharePlant: jest.fn(), shares: [
    { id: "100", contactId: "2", direction: "outgoing", plant: { id: "10", name: "Bird" }, canCompleteTasks: true },
    { id: "101", contactId: "2", direction: "incoming", plant: { id: "11", name: "Pilea" }, canCompleteTasks: false },
    { id: "102", contactId: "3", direction: "outgoing", plant: { id: "12", name: "Other contact's plant" }, canCompleteTasks: true },
  ] };
});
it("shows plants shared in both directions for this contact only", async () => {
  const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  await view.findByLabelText("Contact name");
  expect(view.getByText("Bird")).toBeTruthy(); expect(view.getByText("Pilea")).toBeTruthy(); expect(view.queryByText("Other contact's plant")).toBeNull();
  expect(view.getByText("Can complete tasks")).toBeTruthy(); expect(view.getByText("View only")).toBeTruthy(); expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
});
it("opens the multi-plant sharing form preselected for this contact", async () => {
  const close = jest.fn(); const view = render(<ContactDetailsModal contact={contact} onClose={close} />);
  await view.findByLabelText("Contact name");
  fireEvent.press(view.getByRole("button", { name: "Share plants" })); expect(close).toHaveBeenCalled(); expect(mockSharing.openSharePlant).toHaveBeenCalledWith(undefined, "2");
});
it("waits for fresh sharing data before rendering any editor fields", async () => {
  let finish!: (value: any) => void;
  mockSharing.refresh.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  expect(view.getByTestId("edit-contact-loading")).toBeTruthy();
  expect(view.queryByLabelText("Contact name")).toBeNull();
  expect(view.queryByText("Bird")).toBeNull();
  await act(async () => finish({}));
  expect(view.queryByTestId("edit-contact-loading")).toBeNull();
  expect(view.getByLabelText("Contact name").props.value).toBe("Mom");
  expect(view.getByText("Bird")).toBeTruthy();
});
it("can retry a failed sharing load without disturbing the contact's editable name", async () => {
  mockSharing.error = "unavailable"; const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  await view.findByLabelText("Contact name");
  fireEvent.changeText(view.getByLabelText("Contact name"), "Family"); fireEvent.press(view.getByRole("button", { name: "Try again" }));
  await view.findByLabelText("Contact name");
  expect(mockSharing.refresh).toHaveBeenCalledTimes(2); expect(view.getByLabelText("Contact name").props.value).toBe("Family");
});
it("marks expired grants and still saves the contact's private alias normally", async () => {
  mockSharing.shares[0].isExpired = true; const close = jest.fn(); const view = render(<ContactDetailsModal contact={contact} onClose={close} />);
  await view.findByLabelText("Contact name");
  expect(view.getByText("Expired")).toBeTruthy(); fireEvent.changeText(view.getByLabelText("Contact name"), "Family"); fireEvent.press(view.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); expect(mockContacts.updateContactName).toHaveBeenCalledWith("2", "Family");
});
