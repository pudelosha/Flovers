import React from "react";
import { Linking } from "react-native";
import { TextInput } from "react-native-paper";
import { act, fireEvent, render } from "@testing-library/react-native";
import LoginScreen from "../LoginScreen";
import RegisterScreen from "../RegisterScreen";
import { ApiError } from "../../../../api/client";

let mockLanguage = "pl-PL";
const mockLogin = jest.fn();
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ login: mockLogin, register: jest.fn() }) }));
jest.mock("../../../../app/providers/LanguageProvider", () => ({ useLanguage: () => ({ currentLanguage: mockLanguage }) }));
jest.mock("../../../../shared/ui/TopSnackbar", () => (props: any) => props.visible
  ? require("react").createElement(require("react-native").Text, { testID: "auth-message" }, props.message) : null);

beforeEach(() => { mockLogin.mockReset(); mockLanguage = "pl-PL"; });

it("shows specific activation guidance only for the server's inactive-account code", async () => {
  const view = render(<LoginScreen navigation={{ navigate: jest.fn() }} />);
  const fields = view.UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(fields[0], "unconfirmed@example.test");
  fireEvent.changeText(fields[1], "password123");
  mockLogin.mockRejectedValueOnce(new ApiError(400, { code: "account_not_activated" }));
  await act(async () => { fireEvent.press(view.getByText("login.signIn")); });
  expect(view.getByTestId("auth-message").props.children).toBe("login.errors.accountNotActivated");
  mockLogin.mockRejectedValueOnce(new ApiError(400, { message: "Invalid credentials." }));
  await act(async () => { fireEvent.press(view.getByText("login.signIn")); });
  expect(view.getByTestId("auth-message").props.children).toBe("login.errors.invalidCredentials");
});

it("opens separate localized terms/privacy links without changing consent", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  try {
    const view = render(<RegisterScreen navigation={{ navigate: jest.fn() }} />);
    const event = { stopPropagation: jest.fn() };
    await act(async () => { fireEvent.press(view.getByText("register.termsLink"), event); });
    expect(open).toHaveBeenLastCalledWith("https://flovers.app/pl/terms");
    await act(async () => { fireEvent.press(view.getByText("register.privacyLink"), event); });
    expect(open).toHaveBeenLastCalledWith("https://flovers.app/pl/privacy-policy");
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    expect(view.getAllByRole("checkbox").every((checkbox) => !checkbox.props.accessibilityState?.checked)).toBe(true);
  } finally { open.mockRestore(); }
});
