import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SharingCard from "../SharingCard";

const mockNavigate = jest.fn(), mockRefresh = jest.fn();
let mockState: any;
jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: mockNavigate }), useIsFocused: () => true }));
jest.mock("../../state/ContactsProvider", () => ({ useContacts: () => ({ ...mockState, refresh: mockRefresh }) }));
beforeEach(() => { jest.clearAllMocks(); mockState = { snapshot: { counts: { contacts: 7, incoming: 2 } }, loading: false, error: null }; });
it("shows real contact counts and keeps both Profile destinations", () => {
  const view = render(<SharingCard />);
  expect(view.getByText("Contacts: 7")).toBeTruthy(); expect(view.getByText("Incoming requests: 2")).toBeTruthy();
  expect(view.queryByText("UI preview")).toBeNull(); expect(view.queryByText(/Plant sharing is still a preview/)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: /Contacts/ })); expect(mockNavigate).toHaveBeenLastCalledWith("Contacts");
  fireEvent.press(view.getByRole("button", { name: /Shared plants/ })); expect(mockNavigate).toHaveBeenLastCalledWith("SharedPlants");
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});
it("does not show fictional counts while loading", () => {
  mockState = { snapshot: null, loading: true, error: null }; const view = render(<SharingCard />);
  expect(view.queryByText(/Contacts:/)).toBeNull(); expect(view.queryByText("No pending requests")).toBeNull();
});
it("provides retry when contacts cannot load", () => {
  mockState = { snapshot: null, loading: false, error: "unavailable" }; const view = render(<SharingCard />);
  fireEvent.press(view.getByText(/Could not load contacts/)); expect(mockRefresh).toHaveBeenCalledTimes(2);
});
