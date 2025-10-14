import React from "react";
import { View, Image, ImageStyle, ViewStyle } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  uri?: string | null;
  style?: ImageStyle | (ImageStyle & ViewStyle);
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  /** optional: customize placeholder bg */
  placeholderBg?: string;
  /** optional: customize icon color */
  placeholderIconColor?: string;
  /** optional: icon name */
  placeholderIconName?: string;
};

export default function SafeImage({
  uri,
  style,
  resizeMode = "cover",
  placeholderBg = "rgba(255,255,255,0.08)",
  placeholderIconColor = "rgba(255,255,255,0.6)",
  placeholderIconName = "image-off-outline",
}: Props) {
  const valid = typeof uri === "string" && uri.trim().length > 0;

  if (valid) {
    return <Image source={{ uri: uri! }} style={style as any} resizeMode={resizeMode} />;
  }

  // simple centered placeholder using same box size
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", backgroundColor: placeholderBg }, style as any]}>
      <MaterialCommunityIcons name={placeholderIconName} size={20} color={placeholderIconColor} />
    </View>
  );
}
