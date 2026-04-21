import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";
import type { PromptKey } from "../types/profile.types";
import { useSettings } from "../../../app/providers/SettingsProvider";

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateBySettings(value?: string | Date | null, settings?: any) {
  if (!value) return "—";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

export default function AccountCard({
  email,
  createdAt,
  onPrompt,
  onLogout,
}: {
  email?: string | null;
  createdAt?: string | Date | null;
  onPrompt: (p: PromptKey) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const createdText = useMemo(
    () => formatDateBySettings(createdAt, settings),
    [createdAt, settings]
  );

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