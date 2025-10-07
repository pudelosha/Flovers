import React from "react";
import { Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { controls } from "../profile.styles";

export default function SaveButton({ label = "Save", onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable style={controls.saveBtn} onPress={onPress}>
      <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
      <Text style={controls.saveBtnText}>{label}</Text>
    </Pressable>
  );
}
