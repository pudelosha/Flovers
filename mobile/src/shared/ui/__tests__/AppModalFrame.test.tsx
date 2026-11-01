import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";
import AppModalFrame, { appModalStyles } from "../AppModalFrame";
import AppModalHost from "../AppModalHost";

let mockBottom = 0;
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: mockBottom, left: 0, right: 0 }) }));

it.each([
  [320, 568, 0], [360, 780, 24], [430, 932, 34], [820, 1180, 20],
])("keeps full square modal bounds, scrolling and X above navigation (%sx%s, inset %s)", (width, height, bottom) => {
  mockBottom = bottom;
  const close = jest.fn();
  const view = render(<View style={{ width, height }}>
    <AppModalFrame visible title="Long translated form" onClose={close}>
      {Array.from({ length: 30 }, (_, index) => <Text key={index}>Field {index}</Text>)}
      <Text>Save changes</Text>
    </AppModalFrame>
  </View>);
  const host = StyleSheet.flatten(view.getByTestId("app-modal-host").props.style);
  expect(host.bottom).toBe(64 + Math.max(bottom, 10));
  const panel = StyleSheet.flatten(view.getByTestId("contact-modal-content").props.style);
  const glass = StyleSheet.flatten(view.getByTestId("contact-modal-glass").props.style);
  expect(panel.height).toBe("100%"); expect(panel.width).toBe("100%");
  expect(panel.borderRadius).toBe(0); expect(glass.borderRadius).toBe(0);
  const scroll = view.UNSAFE_getByType(ScrollView);
  const content = StyleSheet.flatten(scroll.props.contentContainerStyle);
  expect(content.paddingTop).toBe(44); expect(content.paddingBottom).toBe(20);
  expect(content.flexGrow).toBe(1); expect(scroll.props.nestedScrollEnabled).toBe(true);
  expect(within(scroll).getByText("Save changes")).toBeTruthy();
  expect(within(scroll).queryByTestId("app-modal-close")).toBeNull();
  const closeStyle = StyleSheet.flatten(view.getByTestId("app-modal-close").props.style);
  expect(closeStyle.top).toBe(8); expect(closeStyle.right).toBe(32);
  fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 1500 } } });
  expect(StyleSheet.flatten(view.getByTestId("app-modal-close").props.style)).toEqual(closeStyle);
  expect(close).not.toHaveBeenCalled();
  fireEvent.press(view.getByTestId("app-modal-close")); expect(close).toHaveBeenCalledTimes(1);
});

it("does not reserve navigation space twice inside an existing host", () => {
  mockBottom = 24;
  const view = render(<AppModalHost><AppModalFrame visible title="Contact" onClose={jest.fn()}><Text>Email</Text></AppModalFrame></AppModalHost>);
  expect(view.getAllByTestId("app-modal-host")).toHaveLength(1);
  expect(StyleSheet.flatten(view.getByTestId("app-modal-host").props.style).bottom).toBe(88);
});

it("uses all available logged-out space without a bottom-navigation reservation", () => {
  const view = render(<AppModalFrame visible reserveBottomBar={false} title="Language" onClose={jest.fn()}><Text>Polski</Text></AppModalFrame>);
  expect(StyleSheet.flatten(view.getByTestId("app-modal-host").props.style).bottom).toBe(0);
});

it("centers a short confirmation with symmetric spacing and supports specialized scroll content", () => {
  const view = render(<AppModalFrame visible centerContent title="Delete?" onClose={jest.fn()}><Text>Cancel</Text></AppModalFrame>);
  const content = StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.contentContainerStyle);
  expect(content.justifyContent).toBe("center"); expect(content.paddingTop).toBe(content.paddingBottom);
  view.rerender(<AppModalFrame visible scrollable={false} onClose={jest.fn()}>
    <ScrollView testID="camera-form" scrollEnabled={false} contentContainerStyle={appModalStyles.scrollContent}><Text>Framing editor</Text></ScrollView>
  </AppModalFrame>);
  expect(view.UNSAFE_getAllByType(ScrollView)).toHaveLength(1);
  expect(view.getByTestId("camera-form").props.scrollEnabled).toBe(false);
  expect(within(view.getByTestId("camera-form")).queryByTestId("app-modal-close")).toBeNull();
});


it("centers full-dialog loading against the complete panel without unmounting asynchronous content", () => {
  const view = render(<AppModalFrame visible loading title="Device details" onClose={jest.fn()}>
    <Text>Waiting for data</Text>
  </AppModalFrame>);
  const spinner = view.getByTestId("app-modal-loading");
  expect(StyleSheet.flatten(spinner.props.style)).toMatchObject({ top: 0, right: 0, bottom: 0, left: 0 });
  const scroll = view.UNSAFE_getByType(ScrollView);
  expect(within(scroll).queryByTestId("app-modal-loading")).toBeNull();
  expect(view.queryByText("Device details")).toBeNull();
  // The hidden subtree stays mounted so native image onLoad can complete.
  expect(view.getByText("Waiting for data", { includeHiddenElements: true })).toBeTruthy();
  expect(view.getByTestId("app-modal-close")).toBeTruthy();
  view.rerender(<AppModalFrame visible title="Device details" onClose={jest.fn()}><Text>Loaded details</Text></AppModalFrame>);
  expect(view.queryByTestId("app-modal-loading")).toBeNull();
  expect(view.getByText("Loaded details")).toBeTruthy();
});
