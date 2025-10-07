import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/plants.styles";

type Props = {
  onEdit: () => void;
  onReminders: () => void;
  onDelete: () => void;
};

function MenuItem({
  label,
  icon,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onPress?: () => void;
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

export default function PlantMenu({ onEdit, onReminders, onDelete }: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem label="Edit" icon="pencil-outline" onPress={onEdit} />
      <MenuItem label="Show reminders" icon="bell-outline" onPress={onReminders} />
      <MenuItem label="Delete" icon="trash-can-outline" danger onPress={onDelete} />
    </View>
  );
}
