import React from "react";
import { Image, ImageBackground, PanResponder, StyleSheet } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import PlantPhotoFramingEditor from "../PlantPhotoFramingEditor";
import FramedPlantImage from "../FramedPlantImage";
import { DEFAULT_PHOTO_FRAMING } from "../../utils/photoFraming";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, values: any) => values?.defaultValue ?? _key }) }));
jest.mock("@react-native-community/slider", () => (props: any) =>
  require("react").createElement(require("react-native").View, props));
let callbacks: any;
beforeEach(() => {
  jest.spyOn(PanResponder, "create").mockImplementation((config: any) => {
    callbacks = config;
    return { panHandlers: {} } as any;
  });
});
afterEach(() => { jest.restoreAllMocks(); });
function event(points: Array<[number, number]>) {
  return { nativeEvent: { touches: points.map(([x, y]) => ({ pageX: x, pageY: y, locationX: x, locationY: y })) } } as any;
}
function open(zoom = 1) {
  const onChange = jest.fn(); const onInteractionChange = jest.fn();
  const view = render(<PlantPhotoFramingEditor uri="file:///photo.jpg" width={960} height={1280}
    value={{ ...DEFAULT_PHOTO_FRAMING, zoom }} onChange={onChange} onInteractionChange={onInteractionChange} />);
  fireEvent(view.getByTestId("photo-framing-viewport"), "layout", { nativeEvent: { layout: { width: 320, height: 200 } } });
  return { view, onChange, onInteractionChange };
}

it("moves the photo beneath two stationary guides and releases parent scrolling afterwards", () => {
  const { view, onChange, onInteractionChange } = open(2);
  const red = StyleSheet.flatten(view.getByTestId("photo-details-guide").props.style);
  const blue = StyleSheet.flatten(view.getByTestId("photo-tiles-guide").props.style);
  act(() => { callbacks.onPanResponderGrant(event([[160, 100]])); callbacks.onPanResponderMove(event([[184, 84]])); });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 2, focal_x: expect.any(Number), focal_y: expect.any(Number) }));
  expect(onChange.mock.calls[0][0].focal_x).toBeLessThan(0.5);
  expect(StyleSheet.flatten(view.getByTestId("photo-details-guide").props.style)).toEqual(red);
  expect(StyleSheet.flatten(view.getByTestId("photo-tiles-guide").props.style)).toEqual(blue);
  expect(onInteractionChange).toHaveBeenLastCalledWith(true);
  act(() => { callbacks.onPanResponderRelease(); });
  expect(onInteractionChange).toHaveBeenLastCalledWith(false);
});

it("pinches to zoom and rebases smoothly when one finger is removed", () => {
  const { onChange, onInteractionChange } = open();
  act(() => {
    callbacks.onPanResponderGrant(event([[120, 100], [200, 100]]));
    callbacks.onPanResponderMove(event([[100, 100], [220, 100]]));
  });
  expect(onChange.mock.calls[0][0].zoom).toBeCloseTo(1.5);
  act(() => { callbacks.onPanResponderMove(event([[100, 100]])); callbacks.onPanResponderMove(event([[110, 110]])); });
  expect(onChange.mock.calls[1][0].zoom).toBeCloseTo(1.5);
  act(() => { callbacks.onPanResponderTerminate(); });
  expect(onInteractionChange).toHaveBeenLastCalledWith(false);
});

it("supports zoom buttons and resetting, and releases scrolling on unmount", () => {
  const { view, onChange, onInteractionChange } = open(2);
  fireEvent.press(view.getByRole("button", { name: "Zoom in" }));
  expect(onChange.mock.calls[0][0].zoom).toBeCloseTo(2.25);
  fireEvent.press(view.getByRole("button", { name: "Reset framing" }));
  expect(onChange).toHaveBeenLastCalledWith(DEFAULT_PHOTO_FRAMING);
  act(() => { callbacks.onPanResponderGrant(event([[150, 100]])); });
  view.unmount();
  expect(onInteractionChange).toHaveBeenLastCalledWith(false);
});

it("waits for local image dimensions and prevents gestures when the image failed to load", () => {
  const view = render(<PlantPhotoFramingEditor uri="file:///photo.jpg" value={DEFAULT_PHOTO_FRAMING} onChange={jest.fn()} />);
  fireEvent(view.getByTestId("photo-framing-viewport"), "layout", { nativeEvent: { layout: { width: 320, height: 200 } } });
  expect(callbacks.onStartShouldSetPanResponder()).toBe(false);
  fireEvent(view.UNSAFE_getByType(Image), "load", { nativeEvent: { source: { width: 900, height: 1200 } } });
  expect(callbacks.onStartShouldSetPanResponder()).toBe(true);
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(callbacks.onStartShouldSetPanResponder()).toBe(false);
  expect(view.getByText("Could not load this photo. Choose it again.")).toBeTruthy();
});

it("renders saved framing immediately when the same photo is repositioned", () => {
  const photo = { id: "11111111-1111-4111-8111-111111111111", url: "/photo/", thumbnail_url: "/photo/thumb/",
    width: 960, height: 1280, byte_size: 90000, framing: { ...DEFAULT_PHOTO_FRAMING, zoom: 2 } };
  const view = render(<FramedPlantImage testID="framed-image" uri="data:image/jpeg;base64,PRIVATE" photo={photo} />);
  fireEvent(view.getByTestId("framed-image"), "layout", { nativeEvent: { layout: { width: 320, height: 88 } } });
  const before = StyleSheet.flatten(view.UNSAFE_getByType(ImageBackground).props.style);
  view.rerender(<FramedPlantImage testID="framed-image" uri="data:image/jpeg;base64,PRIVATE"
    photo={{ ...photo, framing: { focal_x: 0.4, focal_y: 0.6, zoom: 2 } }} />);
  const after = StyleSheet.flatten(view.UNSAFE_getByType(ImageBackground).props.style);
  expect(after.width).toBe(before.width);
  expect(after.left).not.toBe(before.left);
  expect(after.top).not.toBe(before.top);
  expect(view.UNSAFE_getByType(ImageBackground).props.source).toEqual({ uri: "data:image/jpeg;base64,PRIVATE" });
});
