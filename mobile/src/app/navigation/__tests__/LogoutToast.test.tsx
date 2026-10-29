import React from "react";
import { act, render } from "@testing-library/react-native";
import LogoutToast from "../LogoutToast";

let mockAuth: { loading: boolean; token: string | null };
let mockDismiss: () => void;
jest.mock("../../providers/useAuth", () => ({ useAuth: () => mockAuth }));
jest.mock("../../../shared/ui/TopSnackbar", () => {
  const React = require("react"); const { Text } = require("react-native");
  return (props: any) => {
    mockDismiss = props.onDismiss;
    return props.visible ? React.createElement(Text, null, props.message) : null;
  };
});
beforeEach(() => { mockAuth = { loading: false, token: null }; });

it("does not show a logout toast on a fresh login screen", () => {
  const view = render(<LogoutToast />);
  expect(view.queryByText("You’ve been logged out.")).toBeNull();
});

it("shows a dismissible toast after the session ends and clears it on login", () => {
  mockAuth.token = "signed-in";
  const view = render(<LogoutToast />);
  mockAuth = { loading: false, token: null };
  view.rerender(<LogoutToast />);
  expect(view.getByText("You’ve been logged out.")).toBeTruthy();
  act(() => mockDismiss());
  expect(view.queryByText("You’ve been logged out.")).toBeNull();
  mockAuth.token = "next-session";
  view.rerender(<LogoutToast />);
  mockAuth.token = null;
  view.rerender(<LogoutToast />);
  expect(view.getByText("You’ve been logged out.")).toBeTruthy();
  mockAuth.token = "new-login";
  view.rerender(<LogoutToast />);
  expect(view.queryByText("You’ve been logged out.")).toBeNull();
});
