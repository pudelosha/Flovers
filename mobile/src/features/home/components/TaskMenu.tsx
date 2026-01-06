import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/home.styles";
import { useTranslation } from "react-i18next";

type Props = {
  onMarkComplete: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;

  /** Optional: open history for this reminder/task */
  onShowHistory?: () => void;

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
  onShowHistory,
  onDelete,
  showDelete,
}: Props) {
  const { t } = useTranslation();

  const shouldShowDelete =
    showDelete === true || (showDelete === undefined && typeof onDelete === "function");

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
        <Text style={s.menuItemText}>{t("home.menu.markAsComplete")}</Text>
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
        <Text style={s.menuItemText}>{t("home.menu.editReminder")}</Text>
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
        <Text style={s.menuItemText}>{t("home.menu.goToPlant")}</Text>
      </Pressable>

      {onShowHistory && (
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
          <Text style={s.menuItemText}>{t("home.menu.showHistory")}</Text>
        </Pressable>
      )}

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
          <Text style={[s.menuItemText, { color: "#FF6B6B" }]}>{t("home.menu.delete")}</Text>
        </Pressable>
      )}
    </View>
  );
}
