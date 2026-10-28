import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SharingCard from "../SharingCard";
import { SharingPreviewProvider } from "../../state/SharingPreviewProvider";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => 1 }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: { id: 12, email: "owner@example.test" } }) }));

it("shows accepted contacts, incoming request count and both Profile destinations", () => {
  const view = render(<SharingPreviewProvider><SharingCard /></SharingPreviewProvider>);
  expect(view.getByText("Contacts: 2")).toBeTruthy();
  expect(view.getByText("Incoming requests: 1")).toBeTruthy();
  expect(view.getByText("UI preview")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: /Contacts/ }));
  expect(mockNavigate).toHaveBeenLastCalledWith("Contacts");
  fireEvent.press(view.getByRole("button", { name: /Shared plants/ }));
  expect(mockNavigate).toHaveBeenLastCalledWith("SharedPlants");
});
