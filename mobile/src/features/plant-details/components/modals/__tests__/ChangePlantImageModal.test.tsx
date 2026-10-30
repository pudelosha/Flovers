import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Image, PermissionsAndroid, Platform, ScrollView } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import ChangePlantImageModal from "../ChangePlantImageModal";
import { getPlantPhotoUri, deletePlantPhotoById } from "../../../../../shared/utils/photoStorage";
import { fetchPlantInstanceDetail } from "../../../../../api/services/plant-instances.service";
import { uploadPlantPhoto, deletePlantPhoto, updatePlantPhotoFraming } from "../../../../../api/services/plant-photos.service";
import { ApiError } from "../../../../../api/client";
import { usePlantPhoto } from "../../../../../shared/hooks/usePlantPhoto";

jest.mock("react-native-image-picker", () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock("react-i18next", () => { const t = (key: string) => key; return { useTranslation: () => ({ t }) }; });
jest.mock("../../../../../shared/utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn(), deletePlantPhotoById: jest.fn() }));
jest.mock("../../../../../api/services/plant-instances.service", () => ({ fetchPlantInstanceDetail: jest.fn() }));
jest.mock("../../../../../api/services/plant-photos.service", () => ({ uploadPlantPhoto: jest.fn(), deletePlantPhoto: jest.fn(), updatePlantPhotoFraming: jest.fn() }));
jest.mock("../../../../../shared/ui/PlantPhotoFramingEditor", () => (props: any) => {
  const React = require("react");
  const { View, Image } = require("react-native");
  return React.createElement(View, { ...props, testID: "photo-framing-editor" }, React.createElement(Image, { source: { uri: props.uri } }));
});
jest.mock("../../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn() }));

const defaultFraming = { focal_x: 0.5, focal_y: 0.5, zoom: 1 };
const chosenFraming = { focal_x: 0.3, focal_y: 0.6, zoom: 2 };
const oldPhoto = { id: "11111111-1111-4111-8111-111111111111", url: "/old/", thumbnail_url: "/old/thumb/", width: 800, height: 600, byte_size: 90000, framing: defaultFraming, framing_revision: 3 };
const newPhoto = { ...oldPhoto, id: "22222222-2222-4222-8222-222222222222", framing_revision: 0 };
const fetchDetail = fetchPlantInstanceDetail as jest.Mock;
const upload = uploadPlantPhoto as jest.Mock;
const remove = deletePlantPhoto as jest.Mock;
const updateFraming = updatePlantPhotoFraming as jest.Mock;
const deleteLocal = deletePlantPhotoById as jest.Mock;

describe("private photo save lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchDetail.mockResolvedValue({ id: 7, photo: oldPhoto });
    (getPlantPhotoUri as jest.Mock).mockResolvedValue("file:///old.jpg");
    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///picked.jpg" }] });
    (launchCamera as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///camera.jpg" }] });
    (usePlantPhoto as jest.Mock).mockImplementation((photo: any) => ({ uri: photo ? `data:image/jpeg;base64,${photo.id}` : null, loading: false, error: null }));
    upload.mockResolvedValue(newPhoto); remove.mockResolvedValue(undefined); deleteLocal.mockResolvedValue(undefined);
    updateFraming.mockImplementation(async (_id, framing) => ({ ...oldPhoto, framing, framing_revision: 4 }));
  });
  afterEach(() => { jest.restoreAllMocks(); });
  async function open() {
    const onClose = jest.fn(), onChanged = jest.fn();
    const screen = render(<ChangePlantImageModal visible plantId="7" onClose={onClose} onChanged={onChanged} />);
    await waitFor(() => expect(screen.getByText("Choose from gallery")).toBeTruthy());
    return { screen, onClose, onChanged };
  }
  async function pick(screen: ReturnType<typeof render>) {
    await act(async () => { fireEvent.press(screen.getByText("Choose from gallery")); });
  }
  async function save(screen: ReturnType<typeof render>) {
    await act(async () => { fireEvent.press(screen.getByText("Save")); });
  }
  function chooseRemove(screen: ReturnType<typeof render>) {
    fireEvent.press(screen.getByText("Remove photo")); fireEvent.press(screen.getByText("Remove"));
  }

  it("loads the server photo and uploads a resized selection only on Save", async () => {
    const { screen, onChanged, onClose } = await open();
    expect(getPlantPhotoUri).not.toHaveBeenCalled();
    expect(screen.UNSAFE_getByType(Image).props.source.uri).toContain(oldPhoto.id);
    await pick(screen);
    expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ maxWidth: 1280, maxHeight: 1280, quality: 0.8, assetRepresentationMode: "compatible" }));
    expect(upload).not.toHaveBeenCalled();
    await save(screen);
    expect(upload).toHaveBeenCalledWith("7", "file:///picked.jpg", { expectedPhotoId: oldPhoto.id, expectedFramingRevision: 3, framing: defaultFraming, uploadKey: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    expect(deleteLocal).toHaveBeenCalledWith("7"); expect(onChanged).toHaveBeenCalledWith(newPhoto); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("does not allow close or discard while the server is committing", async () => {
    let finish!: (value: typeof newPhoto) => void;
    upload.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { screen, onClose, onChanged } = await open(); await pick(screen);
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Discard changes?")).toBeNull(); expect(onClose).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled();
    await act(async () => { finish(newPhoto); });
    expect(onChanged).toHaveBeenCalledWith(newPhoto); expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("keeps the previous photo and stable retry key after a failed upload", async () => {
    upload.mockRejectedValueOnce(new Error("Offline"));
    const { screen, onChanged, onClose } = await open(); await pick(screen); await save(screen);
    expect(deleteLocal).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Could not update the photo. Your previous photo is unchanged. Please try again.")).toBeTruthy();
    await save(screen); expect(upload).toHaveBeenCalledTimes(2); expect(upload.mock.calls[1][2]).toEqual(upload.mock.calls[0][2]); expect(onChanged).toHaveBeenCalledWith(newPhoto);
  });
  it("blocks a blind overwrite after a server conflict", async () => {
    upload.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
    const { screen, onChanged } = await open(); await pick(screen); await save(screen);
    expect(deleteLocal).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Save")); expect(upload).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole("button", { name: "Close" })); expect(screen.getByText("Discard changes?")).toBeTruthy();
  });
  it("removes a server image only after confirmation and Save", async () => {
    const { screen, onChanged } = await open(); chooseRemove(screen); expect(remove).not.toHaveBeenCalled(); await save(screen);
    expect(remove).toHaveBeenCalledWith("7", { expectedPhotoId: oldPhoto.id, expectedFramingRevision: 3 }); expect(deleteLocal).toHaveBeenCalledWith("7"); expect(onChanged).toHaveBeenCalledWith(null);
  });
  it("does not remove local data or report success when server removal fails", async () => {
    remove.mockRejectedValueOnce(new Error("Offline"));
    const { screen, onChanged, onClose } = await open(); chooseRemove(screen); await save(screen);
    expect(deleteLocal).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it("requires an explicit choice and Save to sync an older local photo", async () => {
    fetchDetail.mockResolvedValue({ id: 7, photo: null }); const { screen } = await open();
    expect(getPlantPhotoUri).toHaveBeenCalledWith("7"); expect(upload).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Upload this photo")); expect(upload).not.toHaveBeenCalled(); await save(screen);
    expect(upload).toHaveBeenCalledWith("7", "file:///old.jpg", expect.objectContaining({ expectedPhotoId: null }));
  });
  it("does not offer mutations when its existing version cannot be loaded", async () => {
    fetchDetail.mockRejectedValueOnce(new Error("Offline"));
    const screen = render(<ChangePlantImageModal visible plantId="7" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Could not load this plant's photo. Please try again.")).toBeTruthy());
    expect(screen.queryByText("Choose from gallery")).toBeNull(); expect(upload).not.toHaveBeenCalled();
  });
  it("does not hide a failed protected-photo read behind the catalogue fallback", async () => {
    (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: new Error("Read failed") });
    const screen = render(<ChangePlantImageModal visible plantId="7" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Could not load this plant's photo. Please try again.")).toBeTruthy());
    expect(screen.queryByText("Choose from gallery")).toBeNull(); expect(upload).not.toHaveBeenCalled();
  });
  it("opens the Android system picker without camera or broad media permission", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const requestPermission = jest.spyOn(PermissionsAndroid, "requestMultiple");
    const { screen } = await open(); await pick(screen);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.UNSAFE_getByType(Image).props.source.uri).toContain("picked.jpg");
  });
  it("requests only camera permission and explains denial without reporting success", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
    const requestPermission = jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({
      [permission]: PermissionsAndroid.RESULTS.DENIED,
    } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
    const { screen, onChanged, onClose } = await open();
    await act(async () => { fireEvent.press(screen.getByText("Take a photo")); });
    expect(requestPermission).toHaveBeenCalledWith([permission]);
    expect(screen.getByText("Allow camera access in your phone settings to take a photo.")).toBeTruthy();
    expect(launchCamera).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it("shows native picker errors while preserving the existing photo", async () => {
    (launchImageLibrary as jest.Mock).mockResolvedValueOnce({ errorCode: "others" });
    const { screen, onChanged, onClose } = await open(); await pick(screen);
    expect(screen.getByText("Could not open the photo picker. Please try again.")).toBeTruthy();
    expect(screen.UNSAFE_getByType(Image).props.source.uri).toContain(oldPhoto.id);
    expect(upload).not.toHaveBeenCalled(); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it("ignores an old plant's upload result after the modal target changes", async () => {
    let finish!: (value: typeof newPhoto) => void;
    upload.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { screen, onClose, onChanged } = await open(); await pick(screen); fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    screen.rerender(<ChangePlantImageModal visible plantId="8" onClose={onClose} onChanged={onChanged} />);
    await act(async () => { finish(newPhoto); }); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });

  it("updates an existing photo's framing without uploading another file", async () => {
    const { screen, onChanged, onClose } = await open();
    fireEvent(screen.getByTestId("photo-framing-editor"), "change", chosenFraming);
    expect(screen.getByTestId("photo-framing-editor").props.value).toEqual(chosenFraming);
    await save(screen);
    expect(updateFraming).toHaveBeenCalledWith("7", chosenFraming, { expectedPhotoId: oldPhoto.id, expectedFramingRevision: 3 });
    expect(upload).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: oldPhoto.id, framing: chosenFraming, framing_revision: 4 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation to discard framing edits and never saves them on close", async () => {
    const { screen, onChanged, onClose } = await open();
    fireEvent(screen.getByTestId("photo-framing-editor"), "change", chosenFraming);
    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("Discard changes?")).toBeTruthy();
    fireEvent.press(screen.getByText("Discard"));
    expect(updateFraming).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps framing changes during upload retry and applies them to an already committed upload", async () => {
    upload.mockRejectedValueOnce(new Error("Response lost"));
    const { screen, onChanged } = await open(); await pick(screen); await save(screen);
    fireEvent(screen.getByTestId("photo-framing-editor"), "change", chosenFraming);
    updateFraming.mockResolvedValueOnce({ ...newPhoto, framing: chosenFraming, framing_revision: 1 });
    await save(screen);
    expect(upload.mock.calls[1][2]).toMatchObject({ framing: chosenFraming, uploadKey: upload.mock.calls[0][2].uploadKey });
    expect(updateFraming).toHaveBeenCalledWith("7", chosenFraming, { expectedPhotoId: newPhoto.id, expectedFramingRevision: 0 });
    expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: newPhoto.id, framing: chosenFraming }));
  });

  it("does not overwrite another device's framing when recovering an upload", async () => {
    upload.mockRejectedValueOnce(new Error("Response lost"));
    const { screen, onChanged, onClose } = await open(); await pick(screen); await save(screen);
    fireEvent(screen.getByTestId("photo-framing-editor"), "change", chosenFraming);
    upload.mockResolvedValueOnce({ ...newPhoto, framing: { focal_x: 0.6, focal_y: 0.4, zoom: 3 }, framing_revision: 2 });
    updateFraming.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
    await save(screen);
    expect(updateFraming).toHaveBeenCalledWith("7", chosenFraming, { expectedPhotoId: newPhoto.id, expectedFramingRevision: 0 });
    expect(screen.getByText("The photo changed on another device. Close this window and reopen it before saving.")).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks a conflicting framing change instead of overwriting another device's crop", async () => {
    updateFraming.mockRejectedValueOnce(new ApiError(409, { code: "photo_conflict" }));
    const { screen, onChanged, onClose } = await open();
    fireEvent(screen.getByTestId("photo-framing-editor"), "change", chosenFraming); await save(screen);
    expect(screen.getByText("The photo changed on another device. Close this window and reopen it before saving.")).toBeTruthy();
    await save(screen);
    expect(updateFraming).toHaveBeenCalledTimes(1); expect(onChanged).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });

  it("pauses parent scrolling only while the photo editor is being dragged", async () => {
    const { screen } = await open();
    fireEvent(screen.getByTestId("photo-framing-editor"), "interactionChange", true);
    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
    fireEvent(screen.getByTestId("photo-framing-editor"), "interactionChange", false);
    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(true);
  });
});
