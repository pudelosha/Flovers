import React, { useMemo } from "react";
import { View, TextInput, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import type { Suggestion } from "../types/create-plant.types";

type Props = {
  value: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (s: Suggestion) => void; // ← return full suggestion incl. id
  suggestions: Suggestion[];                    // ← fed from backend/fallback
};

export default function PlantSearchBox({
  value,
  onChange,
  showSuggestions,
  setShowSuggestions,
  onSelectSuggestion,
  suggestions,
}: Props) {
  const data = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return suggestions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.latin.toLowerCase().includes(q)
    ).slice(0, 12); // cap list a bit
  }, [value, suggestions]);

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

      {showSuggestions && data.length > 0 && (
        <View style={wiz.suggestBox}>
          {data.map((item) => (
            <Pressable
              key={item.id}
              style={wiz.suggestItem}
              onPress={() => {
                onSelectSuggestion(item); // ← pass full item (with id)
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
