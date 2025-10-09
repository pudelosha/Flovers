import React from "react";
import { View, TextInput, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { SUGGESTIONS } from "../constants/create-plant.constants";

type Props = {
  value: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (name: string, latin?: string) => void;
};

export default function PlantSearchBox({
  value,
  onChange,
  showSuggestions,
  setShowSuggestions,
  onSelectSuggestion,
}: Props) {
  // Filter mock suggestions (small list; render without FlatList to avoid nested VirtualizedList warning)
  const data =
    value.trim().length === 0
      ? []
      : SUGGESTIONS.filter(
          (s) =>
            s.name.toLowerCase().includes(value.toLowerCase()) ||
            s.latin.toLowerCase().includes(value.toLowerCase())
        );

  return (
    <View style={{ marginTop: 12, marginBottom: 6 }}>
      <View style={wiz.inputRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search plant"
          placeholderTextColor="rgba(255,255,255,0.75)"
          style={wiz.input}
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
            <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </View>

      {/* Suggestions dropdown (no FlatList to avoid nested VirtualizedList warning) */}
      {showSuggestions && data.length > 0 && (
        <View style={wiz.suggestBox}>
          {data.map((item) => (
            <Pressable
              key={item.id}
              style={wiz.suggestItem}
              onPress={() => {
                onSelectSuggestion(item.name, item.latin);
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
