import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import NotificationsCard from "../NotificationsCard";

describe("NotificationsCard", () => {
  const baseProps = {
    emailDaily: true,
    setEmailDaily: jest.fn(),
    emailHour: 8,
    setEmailHour: jest.fn(),
    email24h: false,
    setEmail24h: jest.fn(),
    pushDaily: true,
    setPushDaily: jest.fn(),
    pushHour: 9,
    setPushHour: jest.fn(),
    push24h: false,
    setPush24h: jest.fn(),
    formatHour: (h: number) => `${String(h).padStart(2, "0")}:00`,
    incHour: (h: number) => h + 1,
    decHour: (h: number) => h - 1,
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("toggles notification switches and saves preferences", () => {
    const { getByText } = render(<NotificationsCard {...baseProps} />);

    fireEvent.press(getByText("profile.notifications.emailDailyLabel"));
    fireEvent.press(getByText("profile.notifications.email24hLabel"));
    fireEvent.press(getByText("profile.notifications.pushDailyLabel"));
    fireEvent.press(getByText("profile.notifications.push24hLabel"));
    fireEvent.press(getByText("profile.common.save"));

    expect(baseProps.setEmailDaily).toHaveBeenCalled();
    expect(baseProps.setEmail24h).toHaveBeenCalled();
    expect(baseProps.setPushDaily).toHaveBeenCalled();
    expect(baseProps.setPush24h).toHaveBeenCalled();
    expect(baseProps.onSave).toHaveBeenCalledTimes(1);
  });
});
