import React from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/home.styles";

type Props = {
  onMarkComplete: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;
  onDelete: () => void;
};

export default function TaskMenu({
  onMarkComplete,
  onEdit,
  onGoToPlant,
  onDelete,
}: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem label="Mark as complete" icon="check-circle-outline" onPress={onMarkComplete} />
      <MenuItem label="Edit reminder" icon="calendar-edit" onPress={onEdit} />
      <MenuItem label="Go to plant" icon="leaf" onPress={onGoToPlant} />
      <MenuItem label="Delete" icon="trash-can-outline" danger onPress={onDelete} />
    </View>
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
    </Pressable>
  );
}
