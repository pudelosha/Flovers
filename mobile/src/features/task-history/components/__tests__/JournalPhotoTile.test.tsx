import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import JournalPhotoTile from "../JournalPhotoTile";
import FramedPlantImage from "../../../../shared/ui/FramedPlantImage";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import type { JournalPhotoItem } from "../../types/task-history.types";

let mockPhoto: any;
jest.mock("../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn(() => mockPhoto) }));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));

const access = { is_owner: true, is_shared: false, can_edit: true, can_complete_tasks: true,
  owner: { id: "1", name: "Anna" }, expires_at: null };
const item: JournalPhotoItem = {
  entryKind: "photo", type: "photo", id: "entry1", plantId: "9", plant: "Bird", location: "Kitchen",
  createdAt: "2026-10-31T12:00:00Z", completedAt: "2026-10-31T12:00:00Z", recordedDate: "2026-10-28",
  note: "A new leaf appeared.\nThe plant has grown taller.", revision: 1, access,
  photo: { id: "photo1", url: "/private/", thumbnail_url: "/private/thumb/", width: 1000, height: 800, byte_size: 5000 },
};
function props() {
  return { item, isMenuOpen: false, onToggleMenu: jest.fn(), onViewPhoto: jest.fn(), onEdit: jest.fn(), onPlantDetails: jest.fn(), onDelete: jest.fn() };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockPhoto = { uri: "data:image/jpeg;base64,PRIVATE", loading: false, error: null, refresh: jest.fn() };
});

it("shows compact photo metadata and full note without downloading a tile image", () => {
 const view=render(<JournalPhotoTile {...props()}/>);
 expect(usePlantPhoto).not.toHaveBeenCalled();
 expect(view.UNSAFE_queryByType(FramedPlantImage)).toBeNull();
 expect(view.getByText('31.10.2026')).toBeTruthy();expect(view.getByText('Anna')).toBeTruthy();
 expect(view.queryByText('Added')).toBeNull();expect(view.queryByText('Photo date: 28.10.2026')).toBeNull();
 expect(view.queryByText('Note')).toBeNull();expect(view.getByText(item.note!).props.numberOfLines).toBeUndefined();
});

it("opens the owner menu from the photo and closes it before editing", () => {
  const handlers = props();
  const view = render(<JournalPhotoTile {...handlers} />);
  fireEvent.press(view.getByText("Bird"));
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(1);
  view.rerender(<JournalPhotoTile {...handlers} isMenuOpen />);
  expect(view.getByText("Edit photo")).toBeTruthy();
  expect(view.getByText("View photo")).toBeTruthy();
  expect(view.getByText("Plant details")).toBeTruthy();
  expect(view.getByText("Delete photo")).toBeTruthy();
  expect(view.getByText("flower-tulip-outline")).toBeTruthy();
  fireEvent.press(view.getByText("View photo"));
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(2);
  expect(handlers.onViewPhoto).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByText("Edit photo"));
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(3);
  expect(handlers.onEdit).toHaveBeenCalledTimes(1);
});

it("allows shared viewers to open the full photo and plant details without exposing mutations", () => {
  const handlers = props();
  const shared = { ...access, is_owner: false, is_shared: true, can_edit: false, expires_at: "2026-12-31T12:00:00Z" };
  const view = render(<JournalPhotoTile {...handlers} item={{ ...item, access: shared }} isMenuOpen />);
  expect(view.getByText("Shared")).toBeTruthy();
  expect(view.queryByText("Edit photo")).toBeNull();
  expect(view.queryByText("Delete photo")).toBeNull();
  fireEvent.press(view.getByText("View photo"));
  expect(handlers.onViewPhoto).toHaveBeenCalledTimes(1);
  expect(usePlantPhoto).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Plant details"));
  expect(handlers.onPlantDetails).toHaveBeenCalledTimes(1);
});

it("uses a truthful fallback if author metadata is absent",()=>{
 const view=render(<JournalPhotoTile {...props()} item={{...item,access:undefined}}/>);
 expect(view.getByText('Unknown user')).toBeTruthy();
});

it("opens the full photo from the shortcut without expanding the tile menu", () => {
  const handlers = props();
  const view = render(<JournalPhotoTile {...handlers} />);
  const stopPropagation = jest.fn();
  fireEvent.press(view.getByRole("button", { name: "View photo" }), { stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(handlers.onViewPhoto).toHaveBeenCalledTimes(1);
  expect(handlers.onToggleMenu).not.toHaveBeenCalled();
  view.rerender(<JournalPhotoTile {...handlers} isMenuOpen />);
  fireEvent.press(view.getByRole("button", { name: "View photo" }), { stopPropagation });
  expect(handlers.onViewPhoto).toHaveBeenCalledTimes(2);
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(1);
});
