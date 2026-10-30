import React, { useState } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { PlantPhoto } from "../../api/services/plant-photos.service";
import { photoImageLayout } from "../utils/photoFraming";

/** A private photo already authorized by usePlantPhoto, with its saved framing. */
export default function FramedPlantImage({ uri, photo, style, onError, testID }: {
  uri: string; photo: PlantPhoto; style?: StyleProp<ViewStyle>; onError?: () => void; testID?: string;
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const layout = viewport.width > 0 && viewport.height > 0
    ? photoImageLayout(photo, viewport, photo.framing) : null;
  return <View testID={testID} pointerEvents="none" style={[styles.clip, style]}
    onLayout={({ nativeEvent: { layout: size } }) => {
      if (size.width > 0 && size.height > 0) setViewport(previous =>
        previous.width === size.width && previous.height === size.height ? previous : { width: size.width, height: size.height });
    }}>
    {layout && <ImageBackground key={uri} source={{ uri }} resizeMode="stretch" onError={onError}
      style={{ position: "absolute", width: layout.width, height: layout.height, left: layout.left, top: layout.top }} />}
  </View>;
}

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
