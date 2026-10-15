import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { launchImageLibrary } from "react-native-image-picker";
import ChangePlantImageModal from "../ChangePlantImageModal";
import { getPlantPhotoUri, persistTempPlantPhoto, promoteTempPhotoToPlant } from "../../../../../shared/utils/photoStorage";

jest.mock("react-native-image-picker", () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock("../../../../../shared/utils/photoStorage", () => ({
  getPlantPhotoUri: jest.fn(), persistTempPlantPhoto: jest.fn(),
  promoteTempPhotoToPlant: jest.fn(), deletePlantPhotoById: jest.fn(),
}));

describe("photo save lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPlantPhotoUri as jest.Mock).mockResolvedValue("file:///old.jpg");
    (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [{ uri: "file:///picked.jpg" }] });
    (persistTempPlantPhoto as jest.Mock).mockResolvedValue("file:///temp.jpg");
  });

  it("does not offer discard or close while a saved photo is still committing", async () => {
    let finish!: (uri: string) => void;
    (promoteTempPhotoToPlant as jest.Mock).mockReturnValueOnce(new Promise<string>(resolve => { finish = resolve; }));
    const onClose = jest.fn();
    const onChanged = jest.fn();
    const screen = render(<ChangePlantImageModal visible plantId="7" onClose={onClose} onChanged={onChanged} />);
    await waitFor(() => expect(screen.getByText("Choose from gallery")).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText("Choose from gallery")); });
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(promoteTempPhotoToPlant).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Discard changes?")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    await act(async () => { finish("file:///saved.jpg"); });
    expect(onChanged).toHaveBeenCalledWith(expect.stringContaining("file:///saved.jpg"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("unlocks close and discard after a failed save without claiming that a photo was changed", async () => {
    (promoteTempPhotoToPlant as jest.Mock).mockRejectedValueOnce(new Error("Storage full"));
    const onClose = jest.fn();
    const onChanged = jest.fn();
    const screen = render(<ChangePlantImageModal visible plantId="7" onClose={onClose} onChanged={onChanged} />);
    await waitFor(() => expect(screen.getByText("Choose from gallery")).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText("Choose from gallery")); });
    await act(async () => { fireEvent.press(screen.getByText("Save")); });
    await waitFor(() => expect(screen.getByText("Storage full")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Close" }));
    fireEvent.press(screen.getByText("Discard"));
    expect(onChanged).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
