import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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
  return (
    <GlassCard>
      <Text style={card.cardTitle}>Account</Text>

      <View style={card.row}>
        <Text style={card.rowLabel}>Email</Text>
        <Text style={card.rowValue}>{email || "—"}</Text>
      </View>
      <View style={card.row}>
        <Text style={card.rowLabel}>Created</Text>
        <Text style={card.rowValue}>{createdText}</Text>
      </View>

      <View style={{ height: 12 }} />

      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={() => onPrompt("email")}>
        <MaterialCommunityIcons name="email-edit-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Change email</Text>
      </Pressable>

      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={() => onPrompt("password")}>
        <MaterialCommunityIcons name="key-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Change password</Text>
      </Pressable>

      <Pressable style={[controls.actionBtnFull, controls.dangerFull]} onPress={() => onPrompt("delete")}>
        <MaterialCommunityIcons name="account-remove-outline" size={18} color="#FF6B6B" />
        <Text style={[controls.actionBtnFullText, { color: "#FF6B6B" }]}>Delete account</Text>
      </Pressable>

      <Pressable style={[controls.actionBtnFull, controls.secondaryFull]} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Log out</Text>
      </Pressable>
    </GlassCard>
  );
}
