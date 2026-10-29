import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import SharedPlantHero from "../SharedPlantHero";
import { getPlantPhotoUri } from "../../../../shared/utils/photoStorage";

jest.mock("../../../../shared/utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn() }));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));

const photo = getPlantPhotoUri as jest.Mock;
const plant = { id: "12", name: "Bird", latin: "Strelitzia alba", location: "Living room", imageUrl: "https://example.test/bird.jpg" };
describe("SharedPlantHero", () => {
  beforeEach(() => { jest.clearAllMocks(); photo.mockResolvedValue(null); });

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
