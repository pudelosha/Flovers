// C:\Projekty\Python\Flovers\mobile\src\features\plants\components\PlantMenu.tsx
import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { s } from "../styles/plants.styles";

type Props = {
  onEdit: () => void;
  onReminders: () => void;
  onDelete: () => void;
  onShowQr: () => void;
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
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlantMenu({
  onEdit,
  onReminders,
  onDelete,
  onShowQr,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage(); // ensure rerender
  React.useMemo(() => {}, [currentLanguage]);

  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem
        label={t("plants.menu.edit", { defaultValue: "Edit plant" })}
        icon="pencil-outline"
        onPress={onEdit}
      />
      <MenuItem
        label={t("plants.menu.reminders", { defaultValue: "Show reminders" })}
        icon="bell-outline"
        onPress={onReminders}
      />
      <MenuItem
        label={t("plants.menu.showQr", { defaultValue: "Show QR code" })}
        icon="qrcode"
        onPress={onShowQr}
      />
      <MenuItem
        label={t("plants.menu.delete", { defaultValue: "Delete plant" })}
        icon="trash-can-outline"
        danger
        onPress={onDelete}
      />
    </View>
  );
}
