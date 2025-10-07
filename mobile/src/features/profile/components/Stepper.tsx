import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { controls } from "../../profile/styles/profile.styles";

export function HourStepper({
  label, value, onDec, onInc,
}: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <View style={controls.stepperRow}>
      <Text style={controls.stepperLabel}>{label}</Text>
      <View style={controls.stepper}>
        <Pressable onPress={onDec} style={controls.stepBtn} android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}>
          <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
        </Pressable>
        <Text style={controls.stepTime}>{value}</Text>
        <Pressable onPress={onInc} style={controls.stepBtn} android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}>
          <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
