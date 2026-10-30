import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import SharedPlantHero from "../SharedPlantHero";
import { getPlantPhotoUri } from "../../../../shared/utils/photoStorage";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import FramedPlantImage from "../../../../shared/ui/FramedPlantImage";

jest.mock("../../../../shared/utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn() }));
jest.mock("../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn() }));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));

const photo = getPlantPhotoUri as jest.Mock;
const plant = { id: "12", name: "Bird", latin: "Strelitzia alba", location: "Living room", imageUrl: "https://example.test/bird.jpg" };
describe("SharedPlantHero", () => {
  beforeEach(() => {
    jest.clearAllMocks(); photo.mockResolvedValue(null);
    (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  });

  it("shows a sharp zoomed custom photo for owners and recipients without consulting legacy files", () => {
    const metadata = { id: "11111111-1111-4111-8111-111111111111", url: "/image/", thumbnail_url: "/thumb/", width: 800, height: 600, byte_size: 90000,
      framing: { focal_x: 0.38, focal_y: 0.61, zoom: 1.7 } };
    (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
    const view = render(<SharedPlantHero plant={{ ...plant, photo: metadata }} preferLocalPhoto />);
    expect(photo).not.toHaveBeenCalled();
    expect(view.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo: metadata });
    view.rerender(<SharedPlantHero plant={{ ...plant, photo: metadata }} expiresAt="2030-01-01T00:00:00Z" />);
    expect(photo).not.toHaveBeenCalled();
    expect(usePlantPhoto).toHaveBeenLastCalledWith(metadata, { variant: "display", expiresAt: "2030-01-01T00:00:00Z" });
    expect(view.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo: metadata });
  });

  it.each([
    { name: "unframed photos", framing: undefined },
    { name: "default framing", framing: { focal_x: 0.5, focal_y: 0.5, zoom: 1 } },
  ])("keeps lightweight thumbnails for $name", ({ framing }) => {
    const metadata = { id: "11111111-1111-4111-8111-111111111111", url: "/image/", thumbnail_url: "/thumb/", width: 800, height: 600, byte_size: 90000, framing };
    (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
    const view = render(<SharedPlantHero plant={{ ...plant, photo: metadata }} />);
    expect(view.UNSAFE_getByType(FramedPlantImage).props.photo).toEqual(metadata);
    expect(usePlantPhoto).toHaveBeenLastCalledWith(metadata, { variant: "thumbnail", expiresAt: undefined });
  });

  it("updates framing for an existing private photo without falling back to catalogue or local files", () => {
    const metadata = { id: "11111111-1111-4111-8111-111111111111", url: "/image/", thumbnail_url: "/thumb/", width: 800, height: 600, byte_size: 90000,
      framing: { focal_x: 0.5, focal_y: 0.5, zoom: 1 } };
    (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
    const view = render(<SharedPlantHero plant={{ ...plant, photo: metadata }} />);
    const updated = { ...metadata, framing: { focal_x: 0.6, focal_y: 0.7, zoom: 2 } };
    view.rerender(<SharedPlantHero plant={{ ...plant, photo: updated }} />);
    expect(view.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo: updated });
    expect(usePlantPhoto).toHaveBeenLastCalledWith(updated, { variant: "display", expiresAt: undefined });
    expect(photo).not.toHaveBeenCalled();
  });

  it("shows the custom name, italic Latin name and a pinned location", () => {
    const view = render(<SharedPlantHero plant={plant} />);
    expect(view.getByText("Bird")).toBeTruthy();
    expect(StyleSheet.flatten(view.getByText("Strelitzia alba").props.style).fontStyle).toBe("italic");
    expect(view.getByText("Living room")).toBeTruthy();
    expect(view.getByText("map-marker-outline")).toBeTruthy();
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: plant.imageUrl });
  });


  it("prefers a numeric owned plant's local photo", async () => {
    photo.mockResolvedValue("file:///owned-bird.jpg");
    const view = render(<SharedPlantHero plant={plant} preferLocalPhoto />);
    await waitFor(() => expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "file:///owned-bird.jpg" }));
    expect(photo).toHaveBeenCalledWith("12");
  });

  it("never reads an incoming plant's local photo even if its id exists on this phone", () => {
    photo.mockResolvedValue("file:///private-owner-photo.jpg");
    const view = render(<SharedPlantHero plant={plant} preferLocalPhoto={false} />);
    expect(photo).not.toHaveBeenCalled();
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: plant.imageUrl });
  });

  it("uses bundled preview images when no image URL is present", () => {
    const view = render(<SharedPlantHero plant={{ id: "preview-pothos", name: "Pothos", previewImage: "pothos" }} preferLocalPhoto />);
    expect(photo).not.toHaveBeenCalled();
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual(require("../../assets/pothos.jpg"));
    view.rerender(<SharedPlantHero plant={{ id: "preview-pothos", name: "Pothos", previewImage: "pothos", imageUrl: "https://example.test/custom.jpg" }} />);
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "https://example.test/custom.jpg" });
  });

  it("does not carry a prior plant's local image into a different or incoming plant", async () => {
    let finish!: (value: string) => void;
    photo.mockResolvedValueOnce("file:///plant12.jpg").mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = render(<SharedPlantHero plant={plant} preferLocalPhoto />);
    await waitFor(() => expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "file:///plant12.jpg" }));
    view.rerender(<SharedPlantHero plant={{ ...plant, id: "13", imageUrl: "https://example.test/plant13.jpg" }} preferLocalPhoto />);
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "https://example.test/plant13.jpg" });
    view.rerender(<SharedPlantHero plant={{ ...plant, id: "14", imageUrl: "https://example.test/incoming.jpg" }} preferLocalPhoto={false} />);
    await act(async () => finish("file:///plant13.jpg"));
    expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "https://example.test/incoming.jpg" });
  });

  it("uses a truthful image placeholder when no photo exists or loading fails", () => {
    const view = render(<SharedPlantHero plant={{ id: "preview-empty", name: "New plant" }} />);
    expect(view.getByText("No image")).toBeTruthy();
    expect(view.queryByTestId("shared-plant-image")).toBeNull();
    view.rerender(<SharedPlantHero plant={plant} />);
    fireEvent(view.UNSAFE_getByType(ImageBackground), "error", {});
    expect(view.getByText("No image")).toBeTruthy();
    expect(view.queryByTestId("shared-plant-image")).toBeNull();
  });
});
