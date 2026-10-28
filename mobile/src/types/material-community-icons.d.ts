declare module "react-native-vector-icons/MaterialCommunityIcons" {
  import type { ComponentType } from "react";
  import type { ColorValue, TextProps } from "react-native";

  export interface MaterialCommunityIconProps extends TextProps {
    name: string;
    size?: number;
    color?: ColorValue;
  }

  const MaterialCommunityIcons: ComponentType<MaterialCommunityIconProps>;
  export default MaterialCommunityIcons;
}
