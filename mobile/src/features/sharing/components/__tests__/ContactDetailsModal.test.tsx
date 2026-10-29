import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
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
it("shows plants shared in both directions for this contact only", () => {
  const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  expect(view.getByText("Bird")).toBeTruthy(); expect(view.getByText("Pilea")).toBeTruthy(); expect(view.queryByText("Other contact's plant")).toBeNull();
  expect(view.getByText("Can complete tasks")).toBeTruthy(); expect(view.getByText("View only")).toBeTruthy(); expect(mockSharing.refresh).toHaveBeenCalledTimes(1);
});
it("opens the multi-plant sharing form preselected for this contact", () => {
  const close = jest.fn(); const view = render(<ContactDetailsModal contact={contact} onClose={close} />);
  fireEvent.press(view.getByRole("button", { name: "Share plants" })); expect(close).toHaveBeenCalled(); expect(mockSharing.openSharePlant).toHaveBeenCalledWith(undefined, "2");
});
it("keeps sharing unavailable while initial data is loading", () => {
  mockSharing.loaded = false; mockSharing.loading = true; mockSharing.shares = [];
  const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  fireEvent.press(view.getByRole("button", { name: "Share plants" })); expect(mockSharing.openSharePlant).not.toHaveBeenCalled(); expect(view.queryByText("You have not shared any plants with this contact.")).toBeNull();
});
it("can retry a failed sharing load without disturbing the contact's editable name", () => {
  mockSharing.error = "unavailable"; const view = render(<ContactDetailsModal contact={contact} onClose={jest.fn()} />);
  fireEvent.changeText(view.getByLabelText("Contact name"), "Family"); fireEvent.press(view.getByRole("button", { name: "Try again" }));
  expect(mockSharing.refresh).toHaveBeenCalledTimes(2); expect(view.getByLabelText("Contact name").props.value).toBe("Family");
});
it("marks expired grants and still saves the contact's private alias normally", async () => {
  mockSharing.shares[0].isExpired = true; const close = jest.fn(); const view = render(<ContactDetailsModal contact={contact} onClose={close} />);
  expect(view.getByText("Expired")).toBeTruthy(); fireEvent.changeText(view.getByLabelText("Contact name"), "Family"); fireEvent.press(view.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); expect(mockContacts.updateContactName).toHaveBeenCalledWith("2", "Family");
});
