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

type ItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

const Item = ({ icon, label, onPress, danger }: ItemProps) => (
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

export default function ReadingMenu({
  onHistory,
  onEdit,
  onDelete,
  onPlantDetails,
}: Props) {
  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <Item icon="chart-line" label="Readings history" onPress={onHistory} />
      <Item icon="sprout-outline" label="Plant details" onPress={onPlantDetails} />
      <Item icon="pencil-outline" label="Edit device" onPress={onEdit} />
      <Item
        icon="trash-can-outline"
        label="Delete device"
        danger
        onPress={onDelete}
      />
    </View>
  );
}
