import { ThemeContrastScope } from "../theme/ThemeContext";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { StyleSheet, View, type ViewProps } from "../theme/native";
import { useIsFocused } from "@react-navigation/native";
import { Portal } from "react-native-paper";

// The app already has a Paper Portal.Host. Isolated consumers can render inline.
const Enabled = createContext(false);
export function FloatingTileMenuProvider({ children }: React.PropsWithChildren) {
  return <Enabled.Provider value={true}>{children}</Enabled.Provider>;
}

export const TILE_MENU_LAYER = 4000;
export const FAB_LAYER = 1000;
type Box = { x: number; y: number; width: number; height: number };

export default function FloatingTileMenu(props: ViewProps) {
  const enabled = useContext(Enabled);
  return <ThemeContrastScope kind="dark">{enabled ? <AnchoredMenu {...props} /> : <View {...props} />}</ThemeContrastScope>;
}

function AnchoredMenu({ children, style, onLayout, ...props }: ViewProps) {
  const focused = useIsFocused();
  const anchorRef = useRef<View>(null);
  const overlayRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const ready = !!anchor && !!origin;
  const measureAnchor = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0)
        setAnchor((previous) =>
          previous &&
          previous.x === x &&
          previous.y === y &&
          previous.width === width &&
          previous.height === height
            ? previous
            : { x, y, width, height }
        );
    });
  }, []);

  if (!focused) return null;

  return (
    <>
      {/* Keep the original anchor in the tile; move only the menu to the overlay.
        It has no layout impact because menu styles are already absolute. */}
      <View
        {...props}
        testID="floating-tile-menu-anchor"
        ref={anchorRef}
        collapsable={false}
        pointerEvents={ready ? "none" : "auto"}
        style={[style, ready && { width: anchor.width, height: anchor.height, opacity: 0 }]}
        onLayout={(event) => {
          onLayout?.(event);
          measureAnchor();
        }}
      >
        {!ready && children}
      </View>
      <Portal>
        <ThemeContrastScope kind="dark"><View
          ref={overlayRef}
          collapsable={false}
          pointerEvents="box-none"
          testID="floating-tile-menu-layer"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: TILE_MENU_LAYER, elevation: TILE_MENU_LAYER },
          ]}
          onLayout={() =>
            overlayRef.current?.measureInWindow((x, y) =>
              setOrigin((previous) =>
                previous?.x === x && previous?.y === y ? previous : { x, y }
              )
            )
          }
        >
          {ready && (
            <View
              {...props}
              pointerEvents="auto"
              style={[
                style,
                {
                  position: "absolute",
                  left: anchor.x - origin.x,
                  top: anchor.y - origin.y,
                  right: undefined,
                  bottom: undefined,
                  width: anchor.width,
                  margin: 0,
                  transform: [],
                  zIndex: TILE_MENU_LAYER,
                  elevation: TILE_MENU_LAYER,
                },
              ]}
            >
              {children}
            </View>
          )}
        </View></ThemeContrastScope>
      </Portal>
    </>
  );
}
