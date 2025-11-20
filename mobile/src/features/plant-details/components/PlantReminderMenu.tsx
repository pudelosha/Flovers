// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\PlantReminderMenu.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/plant-details.styles";

type Props = {
  onMarkComplete: () => void;
  onEdit: () => void;
  onShowHistory: () => void;
};

export default function PlantReminderMenu({
  onMarkComplete,
  onEdit,
  onShowHistory,
}: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <Pressable
        style={s.menuItem}
        onPress={onMarkComplete}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={s.menuItemText}>Mark as complete</Text>
      </Pressable>

      <Pressable
        style={s.menuItem}
        onPress={onEdit}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons
          name="calendar-edit"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={s.menuItemText}>Edit reminder</Text>
      </Pressable>

      <Pressable
        style={s.menuItem}
        onPress={onShowHistory}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons
          name="history"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={s.menuItemText}>Show history</Text>
      </Pressable>
    </View>
  );
}
