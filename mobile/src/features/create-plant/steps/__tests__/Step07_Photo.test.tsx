import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { PermissionsAndroid, Platform } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Step07_Photo from "../Step07_Photo";
import { useCreatePlantWizard } from "../../hooks/useCreatePlantWizard";
import { persistTempPlantPhoto } from "../../../../shared/utils/photoStorage";
import PlantPhotoFramingEditor from "../../../../shared/ui/PlantPhotoFramingEditor";

jest.mock("react-native-image-picker", () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock("../../hooks/useCreatePlantWizard", () => ({ useCreatePlantWizard: jest.fn() }));
jest.mock("../../../../shared/utils/photoStorage", () => ({ persistTempPlantPhoto: jest.fn(), deleteLocalPhoto: jest.fn() }));

describe("wizard photo permission boundaries", () => {
  const setPhotoUri = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, "OS", "android");
    (useCreatePlantWizard as jest.Mock).mockReturnValue({ state: {}, actions: { setPhotoUri } });
    (persistTempPlantPhoto as jest.Mock).mockResolvedValue("file:///wizard/persisted.jpg");
    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///picker.jpg" }] });
    (launchCamera as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///camera.jpg" }] });
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it("can choose and retain a photo without broad photo-library or camera permission", async () => {
    const requestPermission = jest.spyOn(PermissionsAndroid, "requestMultiple");
    const screen = render(<Step07_Photo />);
    await act(async () => { fireEvent.press(screen.getByText("Choose from gallery")); });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(persistTempPlantPhoto).toHaveBeenCalledWith(expect.objectContaining({ sourceUri: "file:///picker.jpg" }));
    expect(setPhotoUri).toHaveBeenCalledWith("file:///wizard/persisted.jpg");
  });

  it("only requests camera permission when taking a photo", async () => {
    const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
    const requestPermission = jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({
      [permission]: PermissionsAndroid.RESULTS.GRANTED,
    } as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>);
    const screen = render(<Step07_Photo />);
    await act(async () => { fireEvent.press(screen.getByText("Take a photo")); });
    expect(requestPermission).toHaveBeenCalledWith([permission]);
    expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ saveToPhotos: false }));
    expect(setPhotoUri).toHaveBeenCalledWith("file:///wizard/persisted.jpg");
  });

  it("keeps the editor's framing in the wizard and forwards drag interaction to its scroll view", async () => {
    const framing = { focal_x: 0.4, focal_y: 0.6, zoom: 2 };
    const setPhotoFraming = jest.fn(), onInteractionChange = jest.fn();
    (useCreatePlantWizard as jest.Mock).mockReturnValue({
      state: { photoUri: "file:///wizard.jpg", photoFraming: framing },
      actions: { setPhotoUri, setPhotoFraming },
    });
    const screen = render(<Step07_Photo onInteractionChange={onInteractionChange} />);
    const editor = screen.UNSAFE_getByType(PlantPhotoFramingEditor);
    expect(editor.props.value).toEqual(framing);
    const changed = { ...framing, zoom: 2.5 };
    await act(async () => { editor.props.onChange(changed); editor.props.onInteractionChange(true); });
    expect(setPhotoFraming).toHaveBeenCalledWith(changed);
    expect(onInteractionChange).toHaveBeenCalledWith(true);
  });
});
