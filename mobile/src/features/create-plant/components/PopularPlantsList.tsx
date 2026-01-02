import React, { useCallback } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GlassCard from "../../profile/components/GlassCard";
import { TRAIT_ICON_BY_KEY } from "../constants/create-plant.constants";
import type { PlantOption } from "../types/create-plant.types";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider"; // Add LanguageProvider import

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

// Note: This component doesn't appear to use translations directly in the provided code,
// but if it needs translations in the future, we've prepared it with the pattern.

export default function PopularPlantsList({
  items,
  selectedId,
  onSelect,
}: {
  items: PlantOption[];
  selectedId?: string;
  onSelect: (p: PlantOption) => void;
}) {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage(); // Use LanguageProvider

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
    console.log('PopularPlantsList rendering with language:', currentLanguage);
  }, [currentLanguage]);

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PlantRow
          plant={item}
          active={selectedId === item.id}
          onPress={() => onSelect(item)}
          getTranslation={getTranslation} // Pass translation function if needed
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <TranslatedText 
            tKey="createPlant.step01.noPlantsAvailable" 
            style={{ color: "rgba(255,255,255,0.7)", textAlign: 'center' }} 
          />
        </View>
      )}
    />
  );
}

function PlantRow({
  plant,
  active,
  onPress,
  getTranslation, // Optional translation function if needed
}: {
  plant: PlantOption;
  active: boolean;
  onPress: () => void;
  getTranslation?: (key: string, fallback?: string) => string;
}) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image
            source={{ uri: plant.imageUrl || "https://picsum.photos/seed/plant/120/120" }}
            style={{ width: 56, height: 56, borderRadius: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
              {plant.name}
            </Text>
            {!!plant.latin && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: "700",
                  fontSize: 12,
                  fontStyle: "italic",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {plant.latin}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              {(plant.traits ?? []).slice(0, 4).map((t) => {
                const icon = TRAIT_ICON_BY_KEY[t] || "leaf";
                return <MaterialCommunityIcons key={t} name={icon} size={16} color="#FFFFFF" />;
              })}
            </View>
          </View>

          {active && <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />}
        </View>
      </GlassCard>
    </Pressable>
  );
}