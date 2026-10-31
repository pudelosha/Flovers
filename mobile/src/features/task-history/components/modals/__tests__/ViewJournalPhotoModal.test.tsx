import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import ViewJournalPhotoModal from "../ViewJournalPhotoModal";
import CenteredSpinner from "../../../../../shared/ui/CenteredSpinner";
import { fetchJournalPhoto } from "../../../../../api/services/journal-photos.service";
import { usePlantPhoto } from "../../../../../shared/hooks/usePlantPhoto";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 12 }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, values: any) => values?.defaultValue ?? _key }) }));
jest.mock("../../../../../api/services/journal-photos.service", () => ({ fetchJournalPhoto: jest.fn() }));
jest.mock("../../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn() }));
jest.mock("../../../../sharing/components/ContactModalFrame", () => ({ visible, children }: any) => {
  const React = require("react"), { View } = require("react-native");
  return visible ? React.createElement(View, null, children) : null;
});
const owner = { is_owner: true, is_shared: false, can_edit: true, can_complete_tasks: true,
  owner: { id: "1", name: "Owner" }, expires_at: null };
const tileEntry: any = { id: "entry", plant: "Bird", photo: { id: "old-image", width: 600, height: 800,
  framing: { focal_x: 0.1, focal_y: 0.9, zoom: 4 } }, access: owner };
const freshEntry = { ...tileEntry, photo: { ...tileEntry.photo, id: "fresh-image" } };
let mockImageLoading = false;
const fetchPhoto = fetchJournalPhoto as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks(); mockImageLoading = false;
  fetchPhoto.mockResolvedValue(freshEntry);
  (usePlantPhoto as jest.Mock).mockImplementation((photo: any) => ({
    uri: photo && !mockImageLoading ? `data:image/jpeg;base64,${photo.id}` : null,
    loading: !!photo && mockImageLoading, error: null, refresh: jest.fn(),
  }));
});
async function open(entry: any = tileEntry) {
  const onClose = jest.fn();
  const view = render(<ViewJournalPhotoModal visible entry={entry} onClose={onClose} />);
  await act(async () => {});
  return { view, onClose };
}
it("fetches the latest private image and displays its full uncropped image", async () => {
  const { view } = await open();
  expect(fetchPhoto).toHaveBeenCalledWith(tileEntry.id);
  const image = view.getByTestId("journal-full-photo");
  expect(image.props.source.uri).toContain("fresh-image");
  expect(image.props.resizeMode).toBe("contain");
  expect(view.UNSAFE_getAllByType(Image)).toHaveLength(1);
  expect(view.UNSAFE_getAllByType(CenteredSpinner)).toHaveLength(1);
  fireEvent(image, "load");
  expect(StyleSheet.flatten(view.getByTestId("journal-full-photo").props.style).opacity).toBe(1);
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
});
it("waits for metadata and private bytes instead of showing an old crop", async () => {
  let finish: any; fetchPhoto.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />);
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  mockImageLoading = true; await act(async () => finish(freshEntry));
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  mockImageLoading = false; view.rerender(<ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />);
  expect(view.getByTestId("journal-full-photo").props.source.uri).toContain("fresh-image");
});
it("lets a shared viewer see the photo without offering edits or deletion", async () => {
  const shared = { ...freshEntry, access: { ...owner, is_owner: false, is_shared: true, can_edit: false } };
  fetchPhoto.mockResolvedValue(shared);
  const { view, onClose } = await open(shared);
  expect(view.getByTestId("journal-full-photo")).toBeTruthy();
  expect(view.queryByText("Edit photo")).toBeNull(); expect(view.queryByText("Delete photo")).toBeNull();
  fireEvent.press(view.getByText("Close")); expect(onClose).toHaveBeenCalledTimes(1);
});
it("re-fetches metadata after a failed authorized read", async () => {
  fetchPhoto.mockRejectedValueOnce(new Error("Revoked")); const { view } = await open();
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  expect(view.getByText("Could not load the photo details. Please try again.")).toBeTruthy();
  fireEvent.press(view.getByText("Try again"));
  await waitFor(() => expect(view.getByTestId("journal-full-photo")).toBeTruthy());
  expect(fetchPhoto).toHaveBeenCalledTimes(2);
});
it("does not retain a previous photo or failure when the modal is reopened", async () => {
  const { view } = await open();
  view.rerender(<ViewJournalPhotoModal visible={false} entry={tileEntry} onClose={jest.fn()} />);
  let finish: any; fetchPhoto.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  view.rerender(<ViewJournalPhotoModal visible entry={tileEntry} onClose={jest.fn()} />);
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  await act(async () => finish({ ...freshEntry, photo: { ...freshEntry.photo, id: "newer-image" } }));
  expect(view.getByTestId("journal-full-photo").props.source.uri).toContain("newer-image");
});
it("hides bytes after sharing access expires", async () => {
  fetchPhoto.mockResolvedValue({ ...freshEntry, access: { ...owner, is_owner: false, is_shared: true,
    can_edit: false, expires_at: "2000-01-01T00:00:00Z" } });
  const { view } = await open();
  expect(view.queryByTestId("journal-full-photo")).toBeNull();
  expect(view.getByText("Could not load the photo details. Please try again.")).toBeTruthy();
});
