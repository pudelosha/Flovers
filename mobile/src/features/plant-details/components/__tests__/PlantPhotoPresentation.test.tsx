import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import PlantInfoTile from "../PlantInfoTile";
import PlantTile from "../../../plants/components/PlantTile";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import { getPlantPhotoUri } from "../../../../shared/utils/photoStorage";
import FramedPlantImage from "../../../../shared/ui/FramedPlantImage";

jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock("../../../sharing/state/SharingPreviewProvider", () => ({ useSharingPreview: () => ({ openSharePlant: jest.fn(), shares: [] }) }));
jest.mock("../../../../shared/hooks/usePlantPhoto", () => ({ usePlantPhoto: jest.fn() }));
jest.mock("../../../../shared/utils/photoStorage", () => ({ getPlantPhotoUri: jest.fn() }));
jest.mock("@react-native-masked-view/masked-view", () => (props: any) =>
  require("react").createElement(require("react-native").View, props, props.children));

const metadata = { id: "11111111-1111-4111-8111-111111111111", url: "/image/", thumbnail_url: "/thumb/", width: 800, height: 600, byte_size: 90000,
  framing: { focal_x: 0.38, focal_y: 0.61, zoom: 1.7 } };
const access = { is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: false,
  owner: { id: "2", name: "Owner" }, expires_at: "2030-01-01T00:00:00Z" };
const plant = { id: 7, display_name: "Fern", plant_definition: { id: 1, name: "Fern", image: "https://example.test/catalogue.jpg" } };
const callbacks = { onPressBody: jest.fn(), onPressMenu: jest.fn(), onDetails: jest.fn(), onEdit: jest.fn(),
  onReminders: jest.fn(), onJournal: jest.fn(), onDelete: jest.fn(), onShowQr: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  (getPlantPhotoUri as jest.Mock).mockResolvedValue("file:///owned-old.jpg");
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
});

it("uses the private display photo on received Plant Details and never reads owner-local files", () => {
  const view = render(<PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} />);
  expect(view.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo: metadata });
  expect(getPlantPhotoUri).not.toHaveBeenCalled();
  expect(usePlantPhoto).toHaveBeenLastCalledWith(metadata, expect.objectContaining({ variant: "display", expiresAt: access.expires_at }));
});
it.each([
  { name: "old unframed photos", framing: undefined, variant: "thumbnail" },
  { name: "default framing", framing: { focal_x: 0.5, focal_y: 0.5, zoom: 1 }, variant: "thumbnail" },
  { name: "zoomed photos", framing: metadata.framing, variant: "display" },
])("chooses the appropriate private image size for $name in plant list tiles", ({ framing, variant }) => {
  const photo = { ...metadata, framing };
  const view = render(<PlantTile plant={{ id: "7", name: "Fern", notes: "", imageUrl: "https://example.test/catalogue.jpg", photo, access }} isMenuOpen={false} {...callbacks} />);
  const image = view.UNSAFE_getByType(FramedPlantImage);
  expect(image.props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo });
  expect(StyleSheet.flatten(image.props.style)).toEqual(StyleSheet.absoluteFillObject);
  expect(usePlantPhoto).toHaveBeenLastCalledWith(photo, { variant, expiresAt: access.expires_at });
});
it.each([true, false])("shows the linked definition photo in details without a custom photo (owner=%s)", async (isOwner) => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  (getPlantPhotoUri as jest.Mock).mockResolvedValue(null);
  const view = render(<PlantInfoTile plant={{ ...plant, photo: null,
    access: { ...access, is_owner: isOwner, is_shared: !isOwner, can_edit: isOwner } } as any} />);
  await act(async () => { await Promise.resolve(); });
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: plant.plant_definition.image });
  if (!isOwner) expect(getPlantPhotoUri).not.toHaveBeenCalled();
});
it("uses the definition thumbnail in details when the definition has no full-size photo", () => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  const view = render(<PlantInfoTile plant={{ ...plant, photo: null, access,
    plant_definition: { ...plant.plant_definition, image: null, image_thumb: "https://example.test/catalogue-thumb.jpg" } } as any} />);
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "https://example.test/catalogue-thumb.jpg" });
});
it("shows the definition image in plant list tiles when the user has not supplied a photo", () => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  const view = render(<PlantTile plant={{ id: "7", name: "Fern", notes: "", photo: null,
    imageUrl: "https://example.test/catalogue-thumb.jpg", access }} isMenuOpen={false} {...callbacks} />);
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "https://example.test/catalogue-thumb.jpg" });
});
it("restores the definition photo after the custom photo is removed", () => {
  (usePlantPhoto as jest.Mock).mockImplementation((photo) => ({
    uri: photo ? "data:image/jpeg;base64,SYNCED" : null, loading: false, error: null,
  }));
  const view = render(<PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} />);
  expect(view.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({ uri: "data:image/jpeg;base64,SYNCED", photo: metadata });
  view.rerender(<PlantInfoTile plant={{ ...plant, photo: null, access } as any} />);
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: plant.plant_definition.image });
});
it("does not carry an owned local image into a different plant while its lookup is pending", async () => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  let finish!: (uri: string) => void;
  (getPlantPhotoUri as jest.Mock).mockResolvedValueOnce("file:///plant7.jpg")
    .mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<PlantInfoTile plant={plant as any} />);
  await waitFor(() => expect(view.UNSAFE_getByType(ImageBackground).props.source.uri).toContain("file:///plant7.jpg"));
  view.rerender(<PlantInfoTile plant={{ ...plant, id: 8 } as any} />);
  expect(view.UNSAFE_getByType(ImageBackground).props.source.uri).toBe("https://example.test/catalogue.jpg");
  await act(async () => { finish("file:///plant8.jpg"); });
  expect(view.UNSAFE_getByType(ImageBackground).props.source.uri).toContain("file:///plant8.jpg");
});
