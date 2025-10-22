import React, { useRef, useState, useMemo, useEffect } from "react";
import { View, Pressable, Animated, ViewStyle } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Text, TextInput } from "react-native-paper";
import { wiz } from "../styles/wizard.styles";

type Suggestion = { id: string; name: string; latin: string };

type Props = {
  value: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (item: Suggestion) => void;
  suggestions: Suggestion[];
  compact?: boolean;         // not used for height: fixed 64 to match Login
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
  // filter suggestions locally
  const data = useMemo(
    () =>
      value.trim().length === 0
        ? []
        : suggestions.filter(
            (s) =>
              s.name.toLowerCase().includes(value.toLowerCase()) ||
              s.latin.toLowerCase().includes(value.toLowerCase())
          ),
    [value, suggestions]
  );

  // ---- Animated floating label (Login-style) ----
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const animateLabel = (to: number) => {
    Animated.timing(animatedLabel, { toValue: to, duration: 200, useNativeDriver: false }).start();
  };

  // ⬇️ NEW: float label when value is set programmatically (popular list)
  useEffect(() => {
    if (value && animatedLabel) {
      animateLabel(1);
    } else if (!isFocused) {
      animateLabel(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    animateLabel(1);
    setShowSuggestions(!!value.trim());
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) animateLabel(0);
  };

  const handleChangeText = (t: string) => {
    if (!isFocused && t) animateLabel(1); // ensure float on first programmatic write
    onChange(t);
  };

  // label animation values (tuned for 64px height)
  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelFontSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"],
  });

  // Container: flat, 64 high to match Login
  const containerStyle = [
    wiz.inputRow, // flat, no border
    { height: 64, paddingVertical: 0, paddingHorizontal: 12, position: "relative" as const },
    style,
  ];

  // Label left aligns with input text:
  // paddingLeft(12) + icon(18) + gap(10) = 40
  const labelLeft = 12 + 18 + 10;

  // dropdown below the 64px input
  const suggestTop = 64;

  return (
    <View style={{ marginTop: 0, marginBottom: 0 }}>
      <View style={containerStyle}>
        <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />

        {/* Animated floating label (Login-style). */}
        <Animated.Text
          style={{
            position: "absolute",
            left: labelLeft,
            top: labelTop as any,
            zIndex: 10,
            fontWeight: "500",
            fontSize: labelFontSize as any,
            color: labelColor as any,
          }}
        >
          Search plant
        </Animated.Text>

        {/* Paper TextInput with no internal label; flat, white text/caret.
            Left edge aligns with label (no extra margin). */}
        <TextInput
          mode="flat"
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder=""
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={{
            flex: 1,
            backgroundColor: "transparent",
            height: 64,
            // IMPORTANT: keep marginLeft 0 so text start x == labelLeft
            marginLeft: 0,
          }}
          contentStyle={{ paddingTop: 20, paddingBottom: 8 }}
          selectionColor="#FFFFFF"
          cursorColor="#FFFFFF"
          textColor="#FFFFFF"
          theme={{
            colors: {
              primary: "#FFFFFF",          // caret, focus
              onSurfaceVariant: "#FFFFFF", // keep Android from dimming to gray/black
            },
          }}
          onSubmitEditing={() => setShowSuggestions(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {!!value && (
          <Pressable
            onPress={() => {
              onChange("");
              animateLabel(0);
              setShowSuggestions(false);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
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
