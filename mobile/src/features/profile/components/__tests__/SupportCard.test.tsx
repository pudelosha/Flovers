import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import SupportCard from "../SupportCard";

describe("SupportCard", () => {
  it("opens support actions and shows build contact info", () => {
    const onContact = jest.fn();
    const onBug = jest.fn();

    const { getByText } = render(
      <SupportCard onContact={onContact} onBug={onBug} />
    );

    fireEvent.press(getByText("profile.support.contactUs"));
    fireEvent.press(getByText("profile.support.reportBug"));

    expect(onContact).toHaveBeenCalledTimes(1);
    expect(onBug).toHaveBeenCalledTimes(1);
    expect(getByText("hello@flovers.app")).toBeTruthy();
  });
});
