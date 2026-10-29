import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import NotificationsCard from "../NotificationsCard";
import { HourStepper } from "../Stepper";

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
    emailSharedDue: false,
    setEmailSharedDue: jest.fn(),
    pushSharedDue: false,
    setPushSharedDue: jest.fn(),
    sharedTaskEmail: false,
    setSharedTaskEmail: jest.fn(),
    sharedTaskPush: true,
    setSharedTaskPush: jest.fn(),
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

  it("shows a third Shared section with independent email and push consent", () => {
    const view = render(<NotificationsCard {...baseProps} />);
    expect(view.getByText("profile.notifications.sharedSection")).toBeTruthy();
    const email = view.getByRole("checkbox", { name: "profile.notifications.sharedEmailLabel" });
    const push = view.getByRole("checkbox", { name: "profile.notifications.sharedPushLabel" });
    expect(email.props.accessibilityState.checked).toBe(false);
    expect(push.props.accessibilityState.checked).toBe(true);
    fireEvent.press(email);
    expect(baseProps.setSharedTaskEmail.mock.calls[0][0](false)).toBe(true);
    expect(baseProps.setSharedTaskPush).not.toHaveBeenCalled();
    fireEvent.press(push);
    expect(baseProps.setSharedTaskPush.mock.calls[0][0](true)).toBe(false);
    expect(baseProps.setEmailDaily).not.toHaveBeenCalled();
    expect(baseProps.setPushDaily).not.toHaveBeenCalled();
  });

  it("toggles caregiver due reminders independently of owned and completion notifications", () => {
    const view = render(<NotificationsCard {...baseProps} />);
    const email = view.getByRole("checkbox", { name: "Email me about due tasks for plants shared with me" });
    const push = view.getByRole("checkbox", { name: "Notify me about due tasks for plants shared with me" });
    expect(email.props.accessibilityState.checked).toBe(false);
    expect(push.props.accessibilityState.checked).toBe(false);
    fireEvent.press(email);
    expect(baseProps.setEmailSharedDue.mock.calls[0][0](false)).toBe(true);
    expect(baseProps.setPushSharedDue).not.toHaveBeenCalled();
    fireEvent.press(push);
    expect(baseProps.setPushSharedDue.mock.calls[0][0](false)).toBe(true);
    expect(baseProps.setEmailDaily).not.toHaveBeenCalled();
    expect(baseProps.setPushDaily).not.toHaveBeenCalled();
    expect(baseProps.setSharedTaskEmail).not.toHaveBeenCalled();
    expect(baseProps.setSharedTaskPush).not.toHaveBeenCalled();
  });

  it("keeps each delivery time available for shared-only reminders or owned follow-ups", () => {
    const view = render(<NotificationsCard {...baseProps} emailDaily={false} pushDaily={false} />);
    expect(view.UNSAFE_queryAllByType(HourStepper)).toHaveLength(0);
    view.rerender(<NotificationsCard {...baseProps} emailDaily={false} pushDaily={false} emailSharedDue pushSharedDue />);
    expect(view.UNSAFE_getAllByType(HourStepper).map((stepper) => stepper.props.value)).toEqual(["08:00", "09:00"]);
    view.rerender(<NotificationsCard {...baseProps} emailDaily={false} pushDaily={false} email24h push24h />);
    expect(view.UNSAFE_getAllByType(HourStepper)).toHaveLength(2);
  });
});
