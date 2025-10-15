import React from "react";
import { View, TextInput, Pressable, Text, ViewStyle } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";

type Suggestion = {
  id: string;
  name: string;
  latin: string;
};

type Props = {
  value: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (item: Suggestion) => void;
  suggestions: Suggestion[];
  /** NEW: make the input row 48px tall, with tighter paddings */
  compact?: boolean;
  /** Optional extra style for the container wrapper */
  style?: ViewStyle;
};

export default function PlantSearchBox({
  value,
  onChange,
  showSuggestions,
  setShowSuggestions,
  onSelectSuggestion,
  suggestions,
  compact = false,
  style,
}: Props) {
  // simple local filter
  const data =
    value.trim().length === 0
      ? []
      : suggestions.filter(
          (s) =>
            s.name.toLowerCase().includes(value.toLowerCase()) ||
            s.latin.toLowerCase().includes(value.toLowerCase())
        );

  const inputRowStyle = [
    wiz.inputRow,
    compact && { height: 48, paddingVertical: 6, paddingHorizontal: 12 }, // ← tighter + fixed height
    style,
  ];

  // dropdown top needs to match the input row height
  const suggestTop = compact ? 48 : 48;

  return (
    <View style={{ marginTop: 0, marginBottom: 0 }}>
      <View style={inputRowStyle}>
        <MaterialCommunityIcons
          name="magnify"
          size={compact ? 18 : 18}
          color="#FFFFFF"
        />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search plant"
          placeholderTextColor="rgba(255,255,255,0.75)"
          style={[wiz.input, { paddingVertical: 0 }]}
          onFocus={() => setShowSuggestions(!!value.trim())}
          onSubmitEditing={() => setShowSuggestions(false)}
        />
        {!!value && (
          <Pressable
            onPress={() => {
              onChange("");
              setShowSuggestions(false);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={compact ? 18 : 18}
              color="rgba(255,255,255,0.9)"
            />
          </Pressable>
        )}
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && data.length > 0 && (
        <View style={[wiz.suggestBox, { top: suggestTop }]}>
          {data.map((item) => (
            <Pressable
              key={item.id}
              style={wiz.suggestItem}
              onPress={() => {
                onSelectSuggestion(item);
                setShowSuggestions(false);
              }}
            >
              <Text style={wiz.suggestName}>{item.name}</Text>
              <Text style={wiz.suggestLatin}>{item.latin}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
