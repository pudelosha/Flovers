import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import WateringScheduleModal from "../WateringScheduleModal";

describe("WateringScheduleModal", () => {
  it("schedules watering when the device has a pump and no pending task", () => {
    const onScheduleWatering = jest.fn();

    const { getAllByText } = render(
      <WateringScheduleModal
        visible
        pumpIncluded
        deviceId={7}
        deviceName="Bedroom node"
        plantName="Calathea"
        onClose={jest.fn()}
        onScheduleWatering={onScheduleWatering}
      />
    );

    const scheduleTexts = getAllByText("Schedule watering");
    fireEvent.press(scheduleTexts[scheduleTexts.length - 1]);

    expect(onScheduleWatering).toHaveBeenCalledTimes(1);
  });

  it("recalls a pending watering task instead of scheduling a second one", () => {
    const onRecallWatering = jest.fn();

    const { getByText } = render(
      <WateringScheduleModal
        visible
        pumpIncluded
        deviceId={7}
        pendingPumpTask={{
          id: 3,
          source: "manual",
          status: "pending",
          requested_at: "2026-05-13T12:00:00Z",
        }}
        onClose={jest.fn()}
        onScheduleWatering={jest.fn()}
        onRecallWatering={onRecallWatering}
      />
    );

    fireEvent.press(getByText("Recall scheduled watering"));

    expect(onRecallWatering).toHaveBeenCalledTimes(1);
  });
});
