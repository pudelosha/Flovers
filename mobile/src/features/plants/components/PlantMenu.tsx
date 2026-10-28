import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { s } from "../styles/plants.styles";

type Props = {
  onDetails: () => void;
  onEdit: () => void;
  onReminders: () => void;
  onJournal: () => void;
  onDelete: () => void;
  onShowQr: () => void;
  onShare?: () => void;
  sharingActive?: boolean;
};

export default function PlantMenu({
  onDetails,
  onEdit,
  onReminders,
  onJournal,
  onDelete,
  onShowQr,
  onShare,
  sharingActive,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      if (typeof txt === "string" && txt && txt !== key) return txt;
      return fallback ?? key.split(".").pop() ?? key;
    },
    [t, currentLanguage]
  );

  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem
        label={tr("plants.menu.details", "Plant details")}
        icon="sprout-outline"
        onPress={onDetails}
      />

      {onShare && <MenuItem
        label={sharingActive ? tr("sharing.plants.manage", "Manage sharing") : tr("sharing.form.share", "Share plants")}
        icon="share-variant-outline"
        onPress={onShare}
      />}

      <MenuItem
        label={tr("plants.menu.edit", "Edit plant")}
        icon="pencil-outline"
        onPress={onEdit}
      />

      <MenuItem
        label={tr("plants.menu.reminders", "Show reminders")}
        icon="bell-outline"
        onPress={onReminders}
      />

      {/* NEW: Journal */}
      <MenuItem
        label={tr("plants.menu.journal", "Show Plant Journal")}
        icon="notebook-outline"
        onPress={onJournal}
      />

      <MenuItem
        label={tr("plants.menu.showQr", "Show QR code")}
        icon="qrcode"
        onPress={onShowQr}
      />

      <MenuItem
        label={tr("plants.menu.delete", "Delete plant")}
        icon="trash-can-outline"
        danger
        onPress={onDelete}
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
        name={icon as any}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
    </Pressable>
  );
}
