import React from "react";
import { View, Text, Pressable } from "../../../shared/theme/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import { controls } from "../../profile/styles/profile.styles";

export type DropdownItem = { key: string; text: string; selected: boolean; disabled?: boolean; onPress: () => void };

export default function Dropdown({
  open, valueText, onToggle, items,
}: { open: boolean; valueText: string; onToggle: () => void; items: DropdownItem[] }) {
  return (
    <View style={controls.dropdown}>
      <Pressable
        style={controls.dropdownHeader}
        onPress={onToggle}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <Text style={controls.dropdownValue}>{valueText}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
      </Pressable>
      {open && (
        <View style={controls.dropdownList}>
          {items.map((it) => (
            <Pressable key={it.key} accessibilityRole="button" accessibilityState={{disabled:!!it.disabled}} disabled={it.disabled}
              style={[controls.dropdownItem,it.disabled && {opacity:0.45}]} onPress={it.onPress}>
              <Text style={controls.dropdownItemText}>{it.text}</Text>
              {it.selected && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
