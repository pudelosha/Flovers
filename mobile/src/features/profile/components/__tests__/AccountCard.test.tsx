import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import AccountCard from "../AccountCard";

describe("AccountCard", () => {
  it("renders account data and opens account prompts", () => {
    const onPrompt = jest.fn();
    const onLogout = jest.fn();

    const { getByText } = render(
      <AccountCard
        email="user@example.com"
        createdAt="2026-05-13T10:00:00Z"
        onPrompt={onPrompt}
        onLogout={onLogout}
      />
    );

    expect(getByText("user@example.com")).toBeTruthy();
    expect(getByText("13.05.2026")).toBeTruthy();

    fireEvent.press(getByText("profile.account.changeEmail"));
    fireEvent.press(getByText("profile.account.changePassword"));
    fireEvent.press(getByText("profile.account.deleteAccount"));
    fireEvent.press(getByText("profile.account.logout"));

    expect(onPrompt).toHaveBeenCalledWith("email");
    expect(onPrompt).toHaveBeenCalledWith("password");
    expect(onPrompt).toHaveBeenCalledWith("delete");
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
