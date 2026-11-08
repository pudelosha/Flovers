import ThemeMaskedView from "../../../../shared/theme/MaskedView";
import {ThemeContext} from "../../../../shared/theme/ThemeContext";
import {LIGHT_COLORS} from "../../../../shared/theme/palette";
import React from "react";
import { ImageBackground, StyleSheet } from "react-native";
import { act, configure, fireEvent, render, waitFor } from "@testing-library/react-native";
import PlantInfoTile from "../PlantInfoTile";
import PlantInfoMenu from "../PlantInfoMenu";
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
  configure({ defaultIncludeHiddenElements: true });
  jest.clearAllMocks();
  (getPlantPhotoUri as jest.Mock).mockResolvedValue("file:///owned-old.jpg");
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
});

it('sizes every parameter from the tallest text, while Notes can grow independently', () => {
  const view = render(<PlantInfoTile plant={{ ...plant, access, notes: 'A long note' } as any} />);
  const soil = view.getByTestId('plant-info-value-shovel');
  fireEvent(view.getByTestId('plant-info-label-shovel'), 'layout', { nativeEvent: { layout: { height: 14, width: 90 } } });
  fireEvent(soil, 'layout', { nativeEvent: { layout: { height: 51, width: 90 } } });
  const fields = ['white-balance-sunny', 'compass-outline', 'shovel', 'pot-outline', 'tape-measure', 'calendar', 'note-edit-outline'];
  for (const field of fields) {
    const style = StyleSheet.flatten(view.getByTestId(`plant-info-field-${field}`).props.style);
    expect(style.minHeight).toBe(85);
    expect(style.height).toBeUndefined();
  }
  expect(view.getByTestId('plant-info-text-note-edit-outline').props.onLayout).toBeUndefined();
  fireEvent(soil, 'layout', { nativeEvent: { layout: { height: 17, width: 90 } } });
  expect(StyleSheet.flatten(view.getByTestId('plant-info-field-calendar').props.style).minHeight).toBe(58);
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
  expect(view.UNSAFE_queryByType(ImageBackground)).toBeNull();
  expect(view.getByTestId("plant-detail-photo-loading")).toBeTruthy();
  await act(async () => { finish("file:///plant8.jpg"); });
  expect(view.UNSAFE_getByType(ImageBackground).props.source.uri).toContain("file:///plant8.jpg");
});

it.each(["details", "list"])("never flashes the definition image while a custom photo loads in %s", screen => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: true, error: null });
  const element = () => screen === "details"
    ? <PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} />
    : <PlantTile plant={{ id: "7", name: "Fern", notes: "", imageUrl: "https://example.test/catalogue.jpg", photo: metadata, access }} isMenuOpen={false} {...callbacks} />;
  const view = render(element());
  expect(view.UNSAFE_queryByType(ImageBackground)).toBeNull();
  expect(view.UNSAFE_queryByType(FramedPlantImage)).toBeNull();
  expect(view.getByTestId(screen === "details" ? "plant-detail-photo-loading" : "plant-tile-photo-loading")).toBeTruthy();
  expect(getPlantPhotoUri).not.toHaveBeenCalled();
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: "data:image/jpeg;base64,SYNCED", loading: false, error: null });
  view.rerender(element());
  expect(view.UNSAFE_getByType(FramedPlantImage).props.uri).toBe("data:image/jpeg;base64,SYNCED");
  expect(view.queryByTestId(screen === "details" ? "plant-detail-photo-loading" : "plant-tile-photo-loading")).toBeNull();
});

it.each(["details", "list"])("does not substitute the definition photo or spin forever when private loading fails in %s", screen => {
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: new Error("Photo unavailable") });
  const view = render(screen === "details"
    ? <PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} />
    : <PlantTile plant={{ id: "7", name: "Fern", notes: "", imageUrl: "https://example.test/catalogue.jpg", photo: metadata, access }} isMenuOpen={false} {...callbacks} />);
  expect(view.UNSAFE_queryByType(ImageBackground)).toBeNull();
  expect(view.UNSAFE_queryByType(FramedPlantImage)).toBeNull();
  expect(view.queryByTestId(screen === "details" ? "plant-detail-photo-loading" : "plant-tile-photo-loading")).toBeNull();
  expect(getPlantPhotoUri).not.toHaveBeenCalled();
});


it("reports definition image readiness only after native load and settles failed images without hanging", async () => {
  (getPlantPhotoUri as jest.Mock).mockResolvedValue(null);
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  const ready = jest.fn();
  const view = render(<PlantInfoTile plant={plant as any} onImageReadyChange={ready} />);
  expect(ready).toHaveBeenLastCalledWith(false);
  await waitFor(() => expect(view.UNSAFE_getByType(ImageBackground)).toBeTruthy());
  expect(ready).toHaveBeenLastCalledWith(false);
  fireEvent(view.UNSAFE_getByType(ImageBackground), "load");
  expect(ready).toHaveBeenLastCalledWith(true);
  view.rerender(<PlantInfoTile plant={{ ...plant, id: 8 } as any} onImageReadyChange={ready} />);
  expect(ready).toHaveBeenLastCalledWith(false);
  await waitFor(() => expect(view.UNSAFE_getByType(ImageBackground)).toBeTruthy());
  fireEvent(view.UNSAFE_getByType(ImageBackground), "error");
  expect(ready).toHaveBeenLastCalledWith(true);
});

it("waits for a private photo decode, and settles a plant with no image", () => {
  const ready = jest.fn();
  const view = render(<PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} onImageReadyChange={ready} />);
  expect(ready).toHaveBeenLastCalledWith(false);
  fireEvent(view.UNSAFE_getByType(FramedPlantImage), "load");
  expect(ready).toHaveBeenLastCalledWith(true);
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  view.rerender(<PlantInfoTile plant={{ ...plant, plant_definition: null, access } as any} onImageReadyChange={ready} />);
  expect(ready).toHaveBeenLastCalledWith(true);
});

it("keeps private plant images and framing while using light detail labels",()=>{
 const ui=render(<ThemeContext.Provider value={{isLight:true,colors:LIGHT_COLORS}}><PlantInfoTile plant={{...plant,photo:metadata,access} as any}/></ThemeContext.Provider>);
 expect(ui.UNSAFE_getByType(FramedPlantImage).props).toMatchObject({uri:"data:image/jpeg;base64,SYNCED",photo:metadata});
 expect(StyleSheet.flatten(ui.getByText("Fern").props.style).color).toBe("#FFFFFF");
});

it("shows an unmasked photo with a separate overlapping description panel",()=>{
 (usePlantPhoto as jest.Mock).mockReturnValue({uri:null,loading:false,error:null});
 const ui=render(<ThemeContext.Provider value={{isLight:true,colors:LIGHT_COLORS}}><PlantTile plant={{id:"7",name:"Fern",notes:"",imageUrl:"https://example.test/catalogue.jpg",access}} isMenuOpen={false} {...callbacks}/></ThemeContext.Provider>);
 expect(ui.UNSAFE_queryByType(ThemeMaskedView)).toBeNull();
 expect(StyleSheet.flatten(ui.getByTestId("plant-tile-description").props.style).marginTop).toBeLessThan(0);
 expect(StyleSheet.flatten(ui.UNSAFE_getByType(ImageBackground).props.style)).toMatchObject({left:0,right:0,top:0,bottom:0});
});

it('opens the plant menu by touching the description without adding a dots button',()=>{
 const view=render(<PlantTile plant={{id:'7',name:'Fern',latin:'Nephrolepis exaltata',location:'Kitchen',notes:''}} isMenuOpen={false} {...callbacks}/>);
 jest.useFakeTimers();
 fireEvent(view.getByTestId('plant-tile-description'), 'layout', { nativeEvent: { layout: { width: 150, height: 80 } } });
 act(() => jest.runAllTimers());
 fireEvent.press(view.getByText('Fern'));
 jest.useRealTimers();
 expect(callbacks.onPressBody).toHaveBeenCalledTimes(1);expect(callbacks.onPressMenu).toHaveBeenCalledTimes(1);
 expect(view.queryByText('dots-horizontal')).toBeNull();expect(view.getByText('Nephrolepis exaltata')).toBeTruthy();expect(view.getByText('Kitchen')).toBeTruthy();
});


it('keeps the full details photo above a separate overlapping information panel', () => {
  const view = render(<PlantInfoTile plant={{ ...plant, photo: metadata, access } as any} />);
  const panel = view.getByTestId('plant-detail-description');
  expect(StyleSheet.flatten(panel.props.style)).toMatchObject({
    marginTop: -40, borderTopLeftRadius: 24, borderBottomLeftRadius: 28,
  });
  expect(view.getByText('Fern')).toBeTruthy();
  expect(view.UNSAFE_getByType(FramedPlantImage).props.photo).toBe(metadata);
  // The image is no longer masked: only the separate surface supplies its fade.
  const image = view.UNSAFE_getByType(FramedPlantImage);
  let ancestor = image.parent;
  while (ancestor) {
    expect(ancestor.type).not.toBe(ThemeMaskedView);
    ancestor = ancestor.parent;
  }
});


it('switches the selected details tab and hides user info outside Info', () => {
  const onTabChange = jest.fn();
  const view = render(<PlantInfoTile plant={plant as any} activeTab="info" onTabChange={onTabChange} />);
  expect(view.getByTestId('plant-detail-description')).toBeTruthy();
  const tabs = view.getAllByRole('tab');
  fireEvent.press(tabs[1]);
  expect(onTabChange).toHaveBeenCalledWith('reminders');
  view.rerender(<PlantInfoTile plant={plant as any} activeTab="reminders" onTabChange={onTabChange} />);
  expect(view.queryByTestId('plant-detail-description')).toBeNull();
  expect(view.getAllByRole('tab')[1].props.accessibilityState.selected).toBe(true);
  fireEvent.press(view.getAllByRole('tab')[2]);
  expect(onTabChange).toHaveBeenLastCalledWith('readings');
});


it('replaces the definition menu option with the owner QR action', () => {
  const onShowQr = jest.fn();
  const props = { onEditPlant: jest.fn(), onChangeImage: jest.fn(), onShowReminders: jest.fn() };
  const view = render(<PlantInfoMenu {...props} onShowQr={onShowQr} />);
  expect(view.queryByText('Plant definition')).toBeNull();
  fireEvent.press(view.getByText('QR Code'));
  expect(onShowQr).toHaveBeenCalledTimes(1);
  view.rerender(<PlantInfoMenu {...props} canEdit={false} />);
  expect(view.queryByText('QR Code')).toBeNull();
});


it('positions Tasks content inside the same overlap as Info without moving the selector',()=>{
 const ui=render(<PlantInfoTile plant={plant as any} activeTab="info"/>);
 const initial=StyleSheet.flatten(ui.getByTestId('plant-detail-description').props.style).marginTop;
 const bar=StyleSheet.flatten(ui.getByTestId('plant-detail-segments').props.style).bottom;
 ui.rerender(<PlantInfoTile plant={plant as any} activeTab="reminders" tabContent={<React.Fragment>Task content</React.Fragment>}/>);
 expect(StyleSheet.flatten(ui.getByTestId('plant-detail-description').props.style).marginTop).toBe(initial);
 expect(StyleSheet.flatten(ui.getByTestId('plant-detail-segments').props.style).bottom).toBe(bar);
});


it('keeps Readings and the no-device message in the same translucent overlapping panel',()=>{
 const ui=render(<PlantInfoTile plant={plant as any} activeTab="info"/>);
 const top=StyleSheet.flatten(ui.getByTestId('plant-detail-description').props.style).marginTop;
 ui.rerender(<PlantInfoTile plant={plant as any} activeTab="readings" tabContent={<React.Fragment>No device</React.Fragment>}/>);
 expect(StyleSheet.flatten(ui.getByTestId('plant-detail-description').props.style).marginTop).toBe(top);
 expect(ui.getByTestId('plant-detail-description')).toBeTruthy();
});


it('puts the owner QR action fourth, after edit, sharing and image actions',()=>{
 const onShowQr=jest.fn();
 const ui=render(<PlantInfoMenu onEditPlant={jest.fn()} onShare={jest.fn()} onChangeImage={jest.fn()} onShowReminders={jest.fn()} onShowQr={onShowQr}/>);
 const options=ui.getAllByText(/^(Edit plant|Share plant|Change image|QR Code|Show reminders)$/);
 expect(options[3].props.children).toBe('QR Code');
});


it('prefers the catalogue hero over the thumbnail in Plant Details',()=>{
 (usePlantPhoto as jest.Mock).mockReturnValue({uri:null,loading:false,error:null});
 const ui=render(<PlantInfoTile plant={{...plant,photo:null,access,plant_definition:{...plant.plant_definition,image_thumb:'https://example.test/thumb.jpg'}} as any}/>);
 expect(ui.UNSAFE_getByType(ImageBackground).props.source).toEqual({uri:plant.plant_definition.image});
});
it('reveals the plant image and panel together after native image loading and panel layout', () => {
  jest.useFakeTimers();
  (usePlantPhoto as jest.Mock).mockReturnValue({ uri: null, loading: false, error: null });
  const element = (imageUrl: string) => <PlantTile plant={{ id: '7', name: 'Fern', notes: '', imageUrl, access }} isMenuOpen={false} {...callbacks} />;
  const ui = render(element('https://example.test/first.jpg'));
  const opacity = () => StyleSheet.flatten(ui.getByTestId('plant-tile-body').props.style).opacity;
  expect(opacity()).toBe(0);
  fireEvent(ui.getByTestId('plant-tile-description'), 'layout', { nativeEvent: { layout: { width: 150, height: 80 } } });
  act(() => jest.runAllTimers());
  expect(opacity()).toBe(0);
  fireEvent(ui.UNSAFE_getByType(ImageBackground), 'load');
  act(() => jest.runAllTimers());
  expect(opacity()).toBe(1);
  ui.rerender(element('https://example.test/replacement.jpg'));
  expect(opacity()).toBe(0);
  fireEvent(ui.UNSAFE_getByType(ImageBackground), 'error');
  act(() => jest.runAllTimers());
  expect(opacity()).toBe(1);
  ui.unmount();
  jest.useRealTimers();
});

afterEach(() => configure({ defaultIncludeHiddenElements: false }));
