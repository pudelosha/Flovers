import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings.styles";

type Props = {
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlantDetails: () => void;
};

const Item = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <Pressable style={s.menuItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
    <Text style={s.menuItemText}>{label}</Text>
  </Pressable>
);

export default function ReadingMenu({ onHistory, onEdit, onDelete, onPlantDetails }: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <Item icon="chart-line" label="History" onPress={onHistory} />
      <Item icon="pencil-outline" label="Edit" onPress={onEdit} />
      <Item icon="trash-can-outline" label="Delete" onPress={onDelete} />
      <Item icon="sprout-outline" label="Plant details" onPress={onPlantDetails} />
    </View>
  );
}
