import React from "react";
import { Pressable, Text } from "../../../shared/theme/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import { useTranslation } from "react-i18next";
import { controls } from "../../profile/styles/profile.styles";

export default function SaveButton({ label, onPress }: { label?: string; onPress: () => void }) {
  const { t } = useTranslation();
  const text = label ?? t("profile.common.save");

  return (
    <Pressable style={controls.saveBtn} onPress={onPress}>
      <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
      <Text style={controls.saveBtnText}>{text}</Text>
    </Pressable>
  );
}
