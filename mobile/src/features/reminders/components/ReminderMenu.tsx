import React from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/reminders.styles";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
};

export default function ReminderMenu({ onEdit, onDelete }: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem label="Edit reminder" icon="calendar-edit" onPress={onEdit} />
      {/* DEBUG: log before delegating to parent onDelete */}
      <MenuItem
        label="Delete reminder"
        icon="trash-can-outline"
        danger
        onPress={() => {
          onDelete();
        }}
      />
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
