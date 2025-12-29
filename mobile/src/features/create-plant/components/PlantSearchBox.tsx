import React, { useRef, useState, useMemo, useEffect } from "react";
import { 
  View, 
  Pressable, 
  Animated, 
  ViewStyle,
  Text  // ✅ Now importing Text from react-native
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { TextInput } from "react-native-paper"; // ✅ Only TextInput from paper
import { wiz } from "../styles/wizard.styles";
import { useTranslation } from "react-i18next"; // Importing i18n

type Suggestion = { id: string; name: string; latin: string };

type Props = {
  value?: string; // ✅ allow undefined safely
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (item: Suggestion) => void;
  suggestions: Suggestion[];
  compact?: boolean; // not used for height: fixed 64 to match Login
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
  const { t } = useTranslation();  // Accessing translation function

  const safeValue = typeof value === "string" ? value : "";

  const data = useMemo(
    () =>
      safeValue.trim().length === 0
        ? []
        : (suggestions ?? []).filter((s) => {
            const name = (s?.name ?? "").toLowerCase();
            const latin = (s?.latin ?? "").toLowerCase();
            const q = safeValue.toLowerCase();
            return name.includes(q) || latin.includes(q);
          }),
    [safeValue, suggestions]
  );

  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(safeValue ? 1 : 0)).current;

  const animateLabel = (to: number) => {
    Animated.timing(animatedLabel, {
      toValue: to,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (safeValue && animatedLabel) {
      animateLabel(1);
    } else if (!isFocused) {
      animateLabel(0);
    }
  }, [safeValue, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    animateLabel(1);
    setShowSuggestions(!!safeValue.trim());
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!safeValue) animateLabel(0);
  };

  const handleChangeText = (t: string) => {
    const next = typeof t === "string" ? t : "";
    if (!isFocused && next) animateLabel(1);
    onChange(next);
  };

  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 8],
  });
  const labelFontSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"],
  });

  const containerStyle = [
    wiz.inputRow,
    {
      height: 64,
      paddingVertical: 0,
      paddingHorizontal: 12,
      position: "relative" as const,
    },
    style,
  ];

  const labelLeft = 12 + 18 + 10;
  const suggestTop = 64;

  return (
    <View style={{ marginTop: 0, marginBottom: 0 }}>
      <View style={containerStyle}>
        <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />

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
          {t('createPlant.step01.searchPlaceholder')}  {/* Using translation here */}
        </Animated.Text>

        <TextInput
          mode="flat"
          value={safeValue}
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
            marginLeft: 0,
          }}
          contentStyle={{ paddingTop: 20, paddingBottom: 8, paddingLeft: 0 }}
          selectionColor="#FFFFFF"
          cursorColor="#FFFFFF"
          textColor="#FFFFFF"
          theme={{
            colors: {
              primary: "#FFFFFF",
              onSurfaceVariant: "#FFFFFF",
            },
          }}
          onSubmitEditing={() => setShowSuggestions(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {!!safeValue && (
          <Pressable
            onPress={() => {
              onChange("");
              animateLabel(0);
              setShowSuggestions(false);
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
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
