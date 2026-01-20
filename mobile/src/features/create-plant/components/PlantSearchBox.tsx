import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { 
  View, 
  Pressable, 
  Animated, 
  ViewStyle,
  Text
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { TextInput } from "react-native-paper";
import { wiz } from "../styles/wizard.styles";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider"; // Add LanguageProvider import

type Suggestion = { id: string; name: string; latin: string };

type Props = {
  value?: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (item: Suggestion) => void;
  suggestions: Suggestion[];
  compact?: boolean;
  style?: ViewStyle;
  placeholder?: string; // Add placeholder prop for flexibility
};

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({ tKey, children, style }: { 
  tKey: string, 
  children?: any, 
  style?: any 
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  // Use currentLanguage to force re-render when language changes
  React.useMemo(() => {}, [currentLanguage]);
  
  try {
    const text = t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    // Fallback to key if translation fails
    const fallbackText = tKey.split('.').pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
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
  placeholder,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage(); // Use LanguageProvider

  const safeValue = typeof value === "string" ? value : "";

  const data = useMemo(
    () =>
      safeValue.trim().length === 0
        ? []
        : (suggestions ?? []).filter((s) => {
            const name = (s?.name ?? "").toLowerCase();
            const latin = (s?.latin ?? "").toLowerCase();
            const formattedLatin = latin.replace(/_/g, ' '); // Replace underscores with spaces
            const q = safeValue.toLowerCase();
            return name.includes(q) || formattedLatin.includes(q); // Compare with formatted Latin name
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

  // Safe translation function that uses both hooks
  const getTranslation = useCallback((key: string, fallback?: string): string => {
    try {
      // Force dependency on currentLanguage to ensure updates
      const lang = currentLanguage;
      const translation = t(key);
      return translation || fallback || key.split('.').pop() || key;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return fallback || key.split('.').pop() || key;
    }
  }, [t, currentLanguage]);

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    console.log('PlantSearchBox rendering with language:', currentLanguage);
  }, [currentLanguage]);

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

  // Determine placeholder text - UPDATED to match your JSON
  const placeholderText = placeholder || getTranslation('createPlant.step01.searchPlaceholder', 'Search plant');

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
          {placeholderText}
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
