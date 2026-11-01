import React from "react";
import { Text, StyleSheet } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";
import TaskHistoryTile from "../TaskHistoryTile";
import type { TaskHistoryItem } from "../../types/task-history.types";
import { s } from "../../styles/task-history.styles";

jest.mock("../../../../app/providers/SettingsProvider", () => ({
  useSettings: () => ({ settings: { dateFormat: "YYYY-MM-DD" } }),
}));

const item: TaskHistoryItem = {
  id: "15", plantId: "4", reminderId: "8", plant: "Blueberry", location: "Balcony",
  type: "watering", completedAt: "2026-10-29T12:30:00Z", completedBy: { id: "7", name: "Anna" },
};
const sharedAccess = {
  is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: true,
  owner: { id: "1", name: "Owner" }, expires_at: null,
};

it("shows Completed, date and the actual actor in three separate single-line rows", () => {
  const view = render(<TaskHistoryTile item={item} isMenuOpen={false} onToggleMenu={jest.fn()} />);
  const column = view.UNSAFE_getByProps({ style: s.rightCol });
  const rows = within(column).UNSAFE_getAllByType(Text);
  expect(rows.map((row) => row.props.children)).toEqual(["Completed", "2026-10-29", "Anna"]);
  rows.forEach((row) => expect(row.props.numberOfLines).toBe(1));
});

it("shows a truthful fallback for history without a recorded actor", () => {
  const view = render(<TaskHistoryTile item={{ ...item, completedBy: undefined }} isMenuOpen={false} onToggleMenu={jest.fn()} />);
  expect(view.getByText("Unknown user")).toBeTruthy();
  expect(view.queryByText("Anna")).toBeNull();
});

it("always shows the complete note once, below the metadata row, without an indicator or expansion actions", () => {
  const note = "Watered slowly.\nChecked the soil before watering.\nNo standing water.";
  const toggleMenu = jest.fn();
  const view = render(<TaskHistoryTile item={{ ...item, note }} isMenuOpen onToggleMenu={toggleMenu} />);
  const noteText = view.getByText(note);
  expect(view.getAllByText(note)).toHaveLength(1);
  expect(noteText.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(noteText.props.style)).not.toHaveProperty("height");
  expect(view.queryByText("note-edit-outline")).toBeNull();
  expect(view.queryByText("taskHistory.menu.expand")).toBeNull();
  expect(view.queryByText("taskHistory.menu.collapse")).toBeNull();
  fireEvent.press(view.getByText("Blueberry"));
  expect(toggleMenu).toHaveBeenCalledTimes(1);
  expect(view.getByText(note)).toBeTruthy();
});

it("omits the notes section when no meaningful note was added", () => {
  const view = render(<TaskHistoryTile item={{ ...item, note: "  " }} isMenuOpen={false} onToggleMenu={jest.fn()} />);
  expect(view.queryByText("taskHistory.tile.noteLabel")).toBeNull();
  expect(view.getByText("Anna")).toBeTruthy();
});

it("opens the submenu from the note and the surrounding tile space without bubbling menu actions", () => {
  const toggleMenu = jest.fn(), pressBody = jest.fn(), goToPlant = jest.fn();
  const view = render(<TaskHistoryTile item={{ ...item, note: "Short note" }} isMenuOpen
    onToggleMenu={toggleMenu} onPressBody={pressBody} onGoToPlant={goToPlant} />);
  const body = view.getByTestId("task-history-tile-body");
  expect(within(body).getByText("Short note")).toBeTruthy();
  fireEvent.press(body);
  fireEvent.press(view.getByText("Short note"));
  expect(toggleMenu).toHaveBeenCalledTimes(2);
  expect(pressBody).toHaveBeenCalledTimes(2);
  fireEvent.press(view.getByText("taskHistory.menu.goToPlant"));
  expect(toggleMenu).toHaveBeenCalledTimes(3);
  expect(pressBody).toHaveBeenCalledTimes(2);
  expect(goToPlant).toHaveBeenCalledTimes(1);
});

it("keeps owner menu actions and prevents shared viewers from editing or deleting history", () => {
  const toggleMenu = jest.fn(), goToPlant = jest.fn();
  const view = render(<TaskHistoryTile item={item} isMenuOpen onToggleMenu={toggleMenu} onGoToPlant={goToPlant} />);
  expect(view.getByText("taskHistory.menu.editReminder")).toBeTruthy();
  expect(view.getByText("taskHistory.menu.deleteTask")).toBeTruthy();
  view.rerender(<TaskHistoryTile item={{ ...item, access: sharedAccess }} isMenuOpen onToggleMenu={toggleMenu} onGoToPlant={goToPlant} />);
  expect(view.queryByText("taskHistory.menu.editReminder")).toBeNull();
  expect(view.queryByText("taskHistory.menu.deleteTask")).toBeNull();
  fireEvent.press(view.getByText("taskHistory.menu.goToPlant"));
  expect(toggleMenu).toHaveBeenCalledTimes(1);
  expect(goToPlant).toHaveBeenCalledWith(expect.objectContaining({ id: "15" }));
});

it("offers Undo only for an owner with server eligibility and forwards the selected task",()=>{
 const undo=jest.fn(),toggle=jest.fn();const eligible={...item,undoCompletion:"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"};
 const view=render(<TaskHistoryTile item={eligible} isMenuOpen onToggleMenu={toggle} onUndo={undo}/>);
 fireEvent.press(view.getByText("Undo completion"));expect(undo).toHaveBeenCalledWith(eligible);expect(toggle).toHaveBeenCalledTimes(1);
 view.rerender(<TaskHistoryTile item={item} isMenuOpen onToggleMenu={toggle} onUndo={undo}/>);
 expect(view.queryByText("Undo completion")).toBeNull();
 view.rerender(<TaskHistoryTile item={{...eligible,access:sharedAccess}} isMenuOpen onToggleMenu={toggle} onUndo={undo}/>);
 expect(view.queryByText("Undo completion")).toBeNull();
});
