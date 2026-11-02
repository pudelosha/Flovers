import {ThemeContext} from "../../theme/ThemeContext";
import {LIGHT_COLORS} from "../../theme/palette";
import {Text as ThemeText} from "../../theme/native";
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FloatingTileMenu, {
  FloatingTileMenuProvider,
  TILE_MENU_LAYER,
  FAB_LAYER,
} from "../FloatingTileMenu";
let mockFocused = true;
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => mockFocused }));
jest.mock("react-native-paper", () => ({
  Portal: ({ children }: any) =>
    require("react").createElement(require("../../theme/ThemeContext").ContrastContext.Provider,{value:"surface"},
      require("react").createElement(require("react-native").View,{testID:"paper-menu-portal"},children)),
}));
const style = {
  position: "absolute" as const,
  right: 8,
  top: -6,
  padding: 10,
  backgroundColor: "black",
  borderRadius: 12,
};
function content(action = jest.fn()) {
  return (
    <FloatingTileMenu style={style}>
      <Pressable onPress={action}>
        <Text>Plant details</Text>
      </Pressable>
    </FloatingTileMenu>
  );
}
function ui(action = jest.fn()) {
  return <FloatingTileMenuProvider>{content(action)}</FloatingTileMenuProvider>;
}
function nativeNode(element: any) {
  return {
    measureInWindow: (callback: any) =>
      element.props.testID === "floating-tile-menu-anchor"
        ? callback(180, 500, 180, 140)
        : callback(0, 24, 400, 800),
  };
}
function measure(view: ReturnType<typeof render>) {
  act(() => {
    fireEvent(view.getByTestId("floating-tile-menu-anchor"), "layout", {
      nativeEvent: { layout: { width: 180, height: 140 } },
    });
    fireEvent(view.getByTestId("floating-tile-menu-layer"), "layout", {
      nativeEvent: { layout: { width: 400, height: 800 } },
    });
  });
}
beforeEach(() => {
  mockFocused = true;
  jest
    .spyOn(View.prototype, "measureInWindow")
    .mockImplementation(function (this: any, callback: any) {
      nativeNode(this).measureInWindow(callback);
    });
});
afterEach(() => jest.restoreAllMocks());
it("moves a single actionable menu above the FAB and adjusts for the host's window origin", () => {
  const action = jest.fn();
  const view = render(ui(action), { createNodeMock: nativeNode });
  measure(view);
  expect(TILE_MENU_LAYER).toBeGreaterThan(FAB_LAYER);
  expect(view.getAllByText("Plant details")).toHaveLength(1);
  const layer = view.getByTestId("floating-tile-menu-layer");
  expect(layer.props.pointerEvents).toBe("box-none");
  const menu = layer
    .findAllByType(View)
    .find((node) => StyleSheet.flatten(node.props.style)?.left === 180);
  expect(StyleSheet.flatten(menu?.props.style)).toMatchObject({
    left: 180,
    top: 476,
    width: 180,
    backgroundColor: "black",
    borderRadius: 12,
  });
  fireEvent.press(view.getByText("Plant details"));
  expect(action).toHaveBeenCalledTimes(1);
  expect(view.getByTestId("floating-tile-menu-anchor").props.pointerEvents).toBe("none");
});
it("removes the portal when its screen loses focus", () => {
  const view = render(ui(), { createNodeMock: nativeNode });
  measure(view);
  mockFocused = false;
  view.rerender(ui());
  expect(view.queryByTestId("floating-tile-menu-layer")).toBeNull();
  expect(view.queryByText("Plant details")).toBeNull();
});
it("leaves the menu usable before native measurements arrive", () => {
  const action = jest.fn();
  const view = render(ui(action));
  fireEvent.press(view.getByText("Plant details"));
  expect(action).toHaveBeenCalledTimes(1);
});

it("preserves black menus and white labels after the portal loses the caller colour scope in Light",()=>{
 const view=render(<ThemeContext.Provider value={{isLight:true,colors:LIGHT_COLORS}}><FloatingTileMenuProvider><FloatingTileMenu style={style}><ThemeText style={{color:"#FFFFFF"}}>Edit plant</ThemeText></FloatingTileMenu></FloatingTileMenuProvider></ThemeContext.Provider>,{createNodeMock:nativeNode});
 measure(view);
 const menu=view.getByTestId("floating-tile-menu-layer").findAllByType(View).find(node=>StyleSheet.flatten(node.props.style)?.left===180);
 expect(StyleSheet.flatten(menu?.props.style).backgroundColor).toBe("black");
 expect(StyleSheet.flatten(view.getByText("Edit plant").props.style).color).toBe("#FFFFFF");
});
