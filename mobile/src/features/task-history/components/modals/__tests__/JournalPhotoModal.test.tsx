import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { launchImageLibrary } from "react-native-image-picker";
import JournalPhotoModal from "../JournalPhotoModal";
import { createJournalPhoto, fetchJournalPhoto, fetchJournalPhotoAvailability, updateJournalPhoto } from "../../../../../api/services/journal-photos.service";
import { usePlantPhoto } from "../../../../../shared/hooks/usePlantPhoto";
import { ApiError } from "../../../../../api/client";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 12 }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-image-picker", () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock("../../../../../api/services/journal-photos.service", () => ({
  fetchJournalPhoto: jest.fn(), fetchJournalPhotoAvailability: jest.fn(), createJournalPhoto: jest.fn(), updateJournalPhoto: jest.fn(),
  newJournalUploadKey: () => "12345678-1234-4234-8234-123456789abc",
}));
jest.mock("../../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn() }));
jest.mock("../../../../../shared/ui/PlantPhotoFramingEditor", () => (props: any) => {
  const React = require("react"); const { View } = require("react-native");
  return React.createElement(View, { ...props, testID: "journal-framing" });
});
jest.mock("../../../../sharing/components/ContactModalFrame", () => ({ visible, children, onClose }: any) => {
  const React = require("react"); const { View, Pressable, Text } = require("react-native");
  return visible ? React.createElement(View, null, children,
    React.createElement(Pressable, { onPress: onClose }, React.createElement(Text, null, "Close frame"))) : null;
});

const plants = [{ id: "7", name: "Bird" }, { id: "8", name: "Aloe" }];
const framing = { focal_x: 0.5, focal_y: 0.5, zoom: 1 };
const entry: any = { id: "entry", plantId: "7", plant: "Bird", revision: 4, note: "Old note", recordedDate: "2026-01-02",
  photo: { width: 800, height: 600, framing }, type: "photo", entryKind: "photo" };
const available = fetchJournalPhotoAvailability as jest.Mock;
const create = createJournalPhoto as jest.Mock;
const update = updateJournalPhoto as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks(); available.mockResolvedValue([{ plant_id: "7", next_photo_at: null }, { plant_id: "8", next_photo_at: null }]);
  (usePlantPhoto as jest.Mock).mockImplementation((photo: any) => ({ uri: photo ? "data:image/jpeg;base64,a" : null, loading: false, error: null, refresh: jest.fn() }));
  (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///photo.jpg", width: 600, height: 800 }] });
  create.mockResolvedValue(entry); update.mockResolvedValue(entry);
  (fetchJournalPhoto as jest.Mock).mockResolvedValue(entry);
});
async function open(extra: any = {}) {
  const onSaved = jest.fn(), onClose = jest.fn();
  const view = render(<JournalPhotoModal visible plantOptions={plants} onSaved={onSaved} onClose={onClose} {...extra} />);
  await waitFor(() => expect(view.getByText("taskHistory.photo.chooseGallery")).toBeTruthy());
  return { view, onSaved, onClose };
}
async function pick(view: ReturnType<typeof render>) {
  await act(async () => fireEvent.press(view.getByText("taskHistory.photo.chooseGallery")));
}
async function save(view: ReturnType<typeof render>) {
  await act(async () => fireEvent.press(view.getByText("taskHistory.photo.save")));
}

it("keeps the form hidden until owner availability has loaded", async () => {
  let finish: any; available.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<JournalPhotoModal visible plantOptions={plants} onSaved={jest.fn()} onClose={jest.fn()} />);
  expect(view.queryByText("taskHistory.photo.chooseGallery")).toBeNull();
  await act(async () => finish([]));
  expect(view.getByText("taskHistory.photo.chooseGallery")).toBeTruthy();
});
it("creates for the selected plant with optional date, notes and framing, only after Save", async () => {
  const { view, onSaved } = await open({ preferredPlantId: "8" }); await pick(view);
  expect(create).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText("taskHistory.photo.notes"), "New leaf");
  await save(view);
  expect(create).toHaveBeenCalledWith("8", "file:///photo.jpg", expect.any(String), { notes: "New leaf", taken_on: null, framing });
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ assetRepresentationMode: "compatible", maxWidth: 1280 }));
});
it("uses the same upload key when retrying a failed upload", async () => {
  create.mockRejectedValueOnce(new Error("Offline")); const { view, onSaved } = await open(); await pick(view); await save(view);
  expect(onSaved).not.toHaveBeenCalled(); expect(view.getByText("taskHistory.photo.retryPending")).toBeTruthy();
  await save(view); expect(create.mock.calls[1]).toEqual(create.mock.calls[0]); expect(onSaved).toHaveBeenCalledTimes(1);
});
it("blocks new photos during that plant's cooldown but permits another plant", async () => {
  available.mockResolvedValue([{ plant_id: "7", next_photo_at: "2099-01-01T00:00:00Z" }, { plant_id: "8", next_photo_at: null }]);
  const { view } = await open(); await pick(view); await save(view); expect(create).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Aloe")); await save(view); expect(create).toHaveBeenCalledWith("8", expect.any(String), expect.any(String), expect.any(Object));
});
it("locks the plant and allows metadata-only edits during cooldown", async () => {
  available.mockResolvedValue([{ plant_id: "7", next_photo_at: "2099-01-01T00:00:00Z" }]);
  const { view } = await open({ entry }); expect(view.queryAllByRole("radio")).toHaveLength(0);
  fireEvent.changeText(view.getByLabelText("taskHistory.photo.notes"), "Updated note");
  fireEvent.press(view.getByText("taskHistory.photo.clearDate")); await save(view);
  expect(update).toHaveBeenCalledWith(entry, { notes: "Updated note", taken_on: null, framing }, undefined);
  expect(create).not.toHaveBeenCalled();
});
it("replaces a photo with the same entry revision and new image dimensions", async () => {
  const { view } = await open({ entry }); await pick(view); await save(view);
  expect(view.getByTestId("journal-framing").props).toMatchObject({ width: 600, height: 800 });
  expect(update).toHaveBeenCalledWith(entry, expect.any(Object), expect.objectContaining({ uri: "file:///photo.jpg", uploadKey: expect.any(String) }));
});
it("does not reveal the edit form before private image bytes are loaded", async () => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: true, error: null });
  const view = render(<JournalPhotoModal visible entry={entry} plantOptions={plants} onSaved={jest.fn()} onClose={jest.fn()} />);
  await act(async () => {}); expect(view.queryByText("taskHistory.photo.chooseGallery")).toBeNull();
});
it("keeps a conflicting edit open and never reports success", async () => {
  update.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
  const { view, onSaved } = await open({ entry }); await save(view);
  expect(onSaved).not.toHaveBeenCalled(); expect(view.getByText("taskHistory.photo.conflict")).toBeTruthy();
});
it("refreshes stale tile metadata on edit-open and reloads after a revision conflict", async () => {
  const fresh = { ...entry, revision: 9, note: "Server note" };
  (fetchJournalPhoto as jest.Mock).mockResolvedValueOnce(fresh).mockResolvedValueOnce({ ...fresh, revision: 10 });
  update.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
  const { view } = await open({ entry });
  expect(view.getByLabelText("taskHistory.photo.notes").props.value).toBe("Server note");
  await save(view); expect(update.mock.calls[0][0].revision).toBe(9);
  fireEvent.press(view.getByText("taskHistory.photo.retry"));
  await waitFor(() => expect(view.queryByText("taskHistory.photo.conflict")).toBeNull());
  await waitFor(() => expect(view.getByText("taskHistory.photo.save")).toBeTruthy());
  await save(view); expect(update.mock.calls[1][0].revision).toBe(10);
});
it("freezes an uncertain submission so retry cannot silently discard changed fields", async () => {
  create.mockRejectedValueOnce(new Error("Connection lost"));
  const { view } = await open(); await pick(view);
  fireEvent.changeText(view.getByLabelText("taskHistory.photo.notes"), "Submitted note"); await save(view);
  expect(view.getByLabelText("taskHistory.photo.notes").props.editable).toBe(false);
  expect(view.getByTestId("journal-framing").props.disabled).toBe(true);
  fireEvent.press(view.getByText("Aloe")); await save(view);
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
  expect(create.mock.calls[1][0]).toBe("7");
});
it("asks the journal to refresh when closing after an uncertain upload", async () => {
  create.mockRejectedValueOnce(new Error("Connection lost"));
  const { view, onClose } = await open(); await pick(view); await save(view);
  fireEvent.press(view.getByText("Close frame")); expect(onClose).toHaveBeenCalledWith(true);
});
it("ignores a picker result after changing to another entry context", async () => {
  let finish: any; (launchImageLibrary as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { view } = await open(); fireEvent.press(view.getByText("taskHistory.photo.chooseGallery"));
  view.rerender(<JournalPhotoModal visible entry={entry} plantOptions={plants} onSaved={jest.fn()} onClose={jest.fn()} />);
  await act(async () => finish({ assets: [{ uri: "file:///stale.jpg" }] }));
  expect(view.getByTestId("journal-framing").props.uri).toContain("data:image");
});
