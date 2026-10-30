import React from "react";
import { StyleSheet, Text } from "react-native";
import { render, within } from "@testing-library/react-native";
import { SharingPage } from "../SharingUI";
import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { useScreenEntryAnimation } from "../../../../shared/hooks/useScreenEntryAnimation";

let mockFocused = true;
const mockEntryStyle = { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.98 }] };
jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockFocused,
  useNavigation: () => ({ navigate: jest.fn(), canGoBack: () => false }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../../../../shared/hooks/useScreenEntryAnimation", () => ({ useScreenEntryAnimation: jest.fn(() => mockEntryStyle) }));
jest.mock("../../../../shared/ui/GlassHeader", () => (props: any) =>
  require("react").createElement(require("react-native").View, { testID: "sharing-header" },
    require("react").createElement(require("react-native").Text, null, props.title)));
jest.mock("../../state/SharingPreviewProvider", () => ({ useSharingPreview: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); mockFocused = true; });

it("keeps the loading spinner visible and starts the content animation only after readiness", () => {
  const view = render(<SharingPage title="Shared plants" contentReady={false}><CenteredSpinner /></SharingPage>);
  expect(useScreenEntryAnimation).toHaveBeenLastCalledWith(false, true);
  expect(StyleSheet.flatten(view.getByTestId("sharing-page-content").props.style).opacity).toBeUndefined();
  expect(view.UNSAFE_getByType(CenteredSpinner)).toBeTruthy();
  expect(view.getByTestId("sharing-page-content")).toBeVisible();
  view.rerender(<SharingPage title="Shared plants" contentReady><Text>Plant tile</Text></SharingPage>);
  expect(useScreenEntryAnimation).toHaveBeenLastCalledWith(true, true);
  expect(StyleSheet.flatten(view.getByTestId("sharing-page-content").props.style).opacity).toBe(0);
  expect(within(view.getByTestId("sharing-page-content")).getByText("Plant tile")).toBeTruthy();
  expect(within(view.getByTestId("sharing-page-content")).queryByText("Shared plants")).toBeNull();
  expect(view.getByTestId("sharing-header")).toBeVisible();
});

it("passes focus changes to the shared animation while leaving the header outside it", () => {
  const view = render(<SharingPage title="Contacts" contentReady><Text>Contact tile</Text></SharingPage>);
  expect(useScreenEntryAnimation).toHaveBeenLastCalledWith(true, true);
  mockFocused = false;
  view.rerender(<SharingPage title="Contacts" contentReady><Text>Contact tile</Text></SharingPage>);
  expect(useScreenEntryAnimation).toHaveBeenLastCalledWith(true, false);
  mockFocused = true;
  view.rerender(<SharingPage title="Contacts" contentReady><Text>Contact tile</Text></SharingPage>);
  expect(useScreenEntryAnimation).toHaveBeenLastCalledWith(true, true);
  expect(view.getByTestId("sharing-header")).toBeVisible();
});
