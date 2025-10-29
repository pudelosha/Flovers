import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/home.styles";

type Props = {
  onMarkComplete: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;
  /** Provide to enable Delete action. */
  onDelete?: () => void;
  /**
   * Explicitly control Delete visibility.
   * - If `true`, show Delete (and call onDelete when pressed).
   * - If `false`, hide Delete even if onDelete exists.
   * - If `undefined`, show Delete only when onDelete is provided.
   */
  showDelete?: boolean;
};

export default function TaskMenu({
  onMarkComplete,
  onEdit,
  onGoToPlant,
  onDelete,
  showDelete,
}: Props) {
  const shouldShowDelete =
    showDelete === true || (showDelete === undefined && typeof onDelete === "function");

  return (
    <View style={s.menuSheet}>
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
        onPress={onGoToPlant}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons
          name="leaf"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={s.menuItemText}>Go to plant</Text>
      </Pressable>

      {shouldShowDelete && (
        <Pressable
          style={[s.menuItem, { marginTop: 2 }]}
          onPress={onDelete}
          android_ripple={{ color: "rgba(255,0,0,0.12)" }}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={18}
            color="#FF6B6B"
            style={{ marginRight: 8 }}
          />
          <Text style={[s.menuItemText, { color: "#FF6B6B" }]}>Delete</Text>
        </Pressable>
      )}
    </View>
  );
}
