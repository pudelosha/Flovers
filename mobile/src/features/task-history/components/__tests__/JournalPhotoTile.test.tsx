import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import JournalPhotoTile from "../JournalPhotoTile";
import FramedPlantImage from "../../../../shared/ui/FramedPlantImage";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import type { JournalPhotoItem } from "../../types/task-history.types";

let mockPhoto: any;
jest.mock("../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn(() => mockPhoto) }));

const access = { is_owner: true, is_shared: false, can_edit: true, can_complete_tasks: true,
  owner: { id: "1", name: "Anna" }, expires_at: null };
const item: JournalPhotoItem = {
  entryKind: "photo", type: "photo", id: "entry1", plantId: "9", plant: "Bird", location: "Kitchen",
  createdAt: "2026-10-31T12:00:00Z", completedAt: "2026-10-31T12:00:00Z", recordedDate: "2026-10-28",
  note: "A new leaf appeared.\nThe plant has grown taller.", revision: 1, access,
  photo: { id: "photo1", url: "/private/", thumbnail_url: "/private/thumb/", width: 1000, height: 800, byte_size: 5000 },
};
function props() {
  return { item, isMenuOpen: false, onToggleMenu: jest.fn(), onEdit: jest.fn(), onPlantDetails: jest.fn(), onDelete: jest.fn() };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockPhoto = { uri: "data:image/jpeg;base64,PRIVATE", loading: false, error: null, refresh: jest.fn() };
});

it("renders a fading authorised photo, Added timestamp and full note without task-type labels", () => {
  const view = render(<JournalPhotoTile {...props()} />);
  expect(usePlantPhoto).toHaveBeenCalledWith(item.photo, { variant: "display", expiresAt: null });
  expect(view.UNSAFE_getByType(FramedPlantImage).props.uri).toBe("data:image/jpeg;base64,PRIVATE");
  expect(view.getByText("Added")).toBeTruthy();
  expect(view.getByText(/31\.10\.2026 \d{2}:\d{2}/)).toBeTruthy();
  expect(view.getByText("Photo date: 28.10.2026")).toBeTruthy();
  expect(view.getByText(item.note!).props.numberOfLines).toBeUndefined();
  expect(view.queryByText("watering")).toBeNull();
  expect(view.queryByText("water")).toBeNull();
});

it("opens the owner menu from the photo and closes it before editing", () => {
  const handlers = props();
  const view = render(<JournalPhotoTile {...handlers} />);
  fireEvent.press(view.getByText("Bird"));
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(1);
  view.rerender(<JournalPhotoTile {...handlers} isMenuOpen />);
  expect(view.getByText("Edit photo")).toBeTruthy();
  expect(view.getByText("Plant details")).toBeTruthy();
  expect(view.getByText("Delete photo")).toBeTruthy();
  expect(view.getByText("flower-tulip-outline")).toBeTruthy();
  fireEvent.press(view.getByText("Edit photo"));
  expect(handlers.onToggleMenu).toHaveBeenCalledTimes(2);
  expect(handlers.onEdit).toHaveBeenCalledTimes(1);
});

it("shows shared status while exposing only Plant details to shared viewers", () => {
  const handlers = props();
  const shared = { ...access, is_owner: false, is_shared: true, can_edit: false, expires_at: "2026-12-31T12:00:00Z" };
  const view = render(<JournalPhotoTile {...handlers} item={{ ...item, access: shared }} isMenuOpen />);
  expect(view.getByText("Shared")).toBeTruthy();
  expect(view.queryByText("Edit photo")).toBeNull();
  expect(view.queryByText("Delete photo")).toBeNull();
  expect(usePlantPhoto).toHaveBeenCalledWith(item.photo, { variant: "display", expiresAt: shared.expires_at });
  fireEvent.press(view.getByText("Plant details"));
  expect(handlers.onPlantDetails).toHaveBeenCalledTimes(1);
});

it("shows a spinner or failure placeholder without falling back to another plant image", () => {
  mockPhoto = { ...mockPhoto, uri: null, loading: true };
  const view = render(<JournalPhotoTile {...props()} />);
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.UNSAFE_queryByType(FramedPlantImage)).toBeNull();
  mockPhoto = { ...mockPhoto, loading: false, error: new Error("Access expired") };
  view.rerender(<JournalPhotoTile {...props()} />);
  expect(view.getByText("image-off-outline")).toBeTruthy();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});
