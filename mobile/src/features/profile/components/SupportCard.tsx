import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";

export default function SupportCard({
  onContact,
  onBug,
}: {
  onContact: () => void;
  onBug: () => void;
}) {
  return (
    <GlassCard>
      <Text style={card.cardTitle}>Support</Text>

      {/* Contact Us */}
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={onContact}>
        <MaterialCommunityIcons name="email-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Contact us</Text>
      </Pressable>

      {/* Report a bug */}
      <Pressable style={[controls.actionBtnFull, controls.secondaryFull]} onPress={onBug}>
        <MaterialCommunityIcons name="bug-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Report a bug</Text>
      </Pressable>

      {/* About (moved from Settings) */}
      <View style={controls.sectionDivider} />
      <View style={controls.aboutBox}>
        <Text style={controls.aboutTitle}>About the app</Text>
        <Text style={controls.aboutLine}>
          Version: <Text style={controls.aboutStrong}>1.0.0</Text>
        </Text>
        <Text style={controls.aboutLine}>
          Release date: <Text style={controls.aboutStrong}>07.10.2025</Text>
        </Text>
        <Text style={controls.aboutLine}>
          Contact: <Text style={controls.aboutStrong}>hello@flovers.app</Text>
        </Text>
      </View>
    </GlassCard>
  );
}
