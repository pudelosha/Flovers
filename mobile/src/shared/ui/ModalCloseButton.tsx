import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
  iconSize?: number;
};

export default function ModalCloseButton({
  onPress,
  accessibilityLabel = "Close",
  style,
  size = 34,
  iconSize = 20,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 999,
          elevation: 999,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.22)",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name="close" size={iconSize} color="#fff" />
    </Pressable>
  );
}