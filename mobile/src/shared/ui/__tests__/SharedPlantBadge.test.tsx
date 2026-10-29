import React from "react";
import { render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import SharedPlantBadge from "../SharedPlantBadge";
import TaskTile from "../../../features/home/components/TaskTile";

jest.mock("../../../app/providers/SettingsProvider", () => ({
  useSettings: () => ({ settings: { dateFormat: "YYYY-MM-DD" } }),
}));

const access = {
  is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: true,
  owner: { id: "1", name: "Alice" }, expires_at: null,
};

it("keeps the existing owner label for Readings and other full badges", () => {
  const view = render(<SharedPlantBadge access={access} />);
  const text = view.getByText("Shared by Alice");
  expect(StyleSheet.flatten(text.props.style).fontSize).toBe(11);
});

it("uses a smaller Shared label without the owner's name in compact badges", () => {
  const view = render(<SharedPlantBadge access={access} compact />);
  expect(StyleSheet.flatten(view.getByText("Shared").props.style).fontSize).toBe(10);
  expect(view.queryByText(/Alice/)).toBeNull();
});

it("places Home's compact badge in the due-date column", () => {
  const noop = () => {};
  const view = render(<TaskTile
    task={{ id: "1", type: "watering", plant: "Fern", location: "Kitchen",
      due: "Tomorrow", dueDiffDays: 1, dueDate: new Date(2026, 9, 30), access }}
    isMenuOpen={false} onToggleMenu={noop} onMarkComplete={noop} onEdit={noop} onGoToPlant={noop}
  />);
  const due = within(view.getByTestId("task-due"));
  expect(due.getByText("2026-10-30")).toBeTruthy();
  expect(due.getByText("Shared")).toBeTruthy();
});
