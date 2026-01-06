import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";
import type { PromptKey } from "../types/profile.types";

export default function AccountCard({
  email, createdText, onPrompt, onLogout,
}: {
  email?: string | null;
  createdText: string;
  onPrompt: (p: PromptKey) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <Text style={card.cardTitle}>{t("profile.account.title")}</Text>

      <View style={card.row}>
        <Text style={card.rowLabel}>{t("profile.account.emailLabel")}</Text>
        <Text style={card.rowValue}>{email || "—"}</Text>
      </View>
      <View style={card.row}>
        <Text style={card.rowLabel}>{t("profile.account.createdLabel")}</Text>
        <Text style={card.rowValue}>{createdText}</Text>
      </View>

      <View style={{ height: 12 }} />

      <Pressable
        style={[controls.actionBtnFull, controls.actionPrimary]}
        onPress={() => onPrompt("email")}
      >
        <MaterialCommunityIcons name="email-edit-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>
          {t("profile.account.changeEmail")}
        </Text>
      </Pressable>

      <Pressable
        style={[controls.actionBtnFull, controls.actionPrimary]}
        onPress={() => onPrompt("password")}
      >
        <MaterialCommunityIcons name="key-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>
          {t("profile.account.changePassword")}
        </Text>
      </Pressable>

      <Pressable
        style={[controls.actionBtnFull, controls.dangerFull]}
        onPress={() => onPrompt("delete")}
      >
        <MaterialCommunityIcons name="account-remove-outline" size={18} color="#FF6B6B" />
        <Text style={[controls.actionBtnFullText, { color: "#FF6B6B" }]}>
          {t("profile.account.deleteAccount")}
        </Text>
      </Pressable>

      <Pressable style={[controls.actionBtnFull, controls.secondaryFull]} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>
          {t("profile.account.logout")}
        </Text>
      </Pressable>
    </GlassCard>
  );
}
