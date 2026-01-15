import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Pressable,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { wiz } from "../styles/wizard.styles";
import PlantSearchBox from "../components/PlantSearchBox";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  fetchPopularPlants,
  fetchPlantSearchIndex,
} from "../../../api/services/plant-definitions.service";
import type { PopularPlant, Suggestion } from "../types/create-plant.types";
import SafeImage from "../../../shared/ui/SafeImage";

import {
  SUN_ICON_BY_LEVEL,
  WATER_ICON_BY_LEVEL,
  DIFFICULTY_ICON_BY_LEVEL,
  SUN_LABEL_BY_LEVEL,
  WATER_LABEL_BY_LEVEL,
  DIFFICULTY_LABEL_BY_LEVEL,
} from "../constants/create-plant.constants";

type Props = {
  onScrollToTop: () => void;
  onOpenScanner: () => void;
  onRegisterScanResultHandler: (fn: (plant: Suggestion) => void) => void;
};

function pickName(item: any): string {
  if (!item) return "";
  const v = item?.name ?? item?.display_name ?? item?.displayName ?? item?.title ?? "";
  return typeof v === "string" ? v : String(v);
}

// Same green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({
  tKey,
  children,
  style,
}: {
  tKey: string;
  children?: any;
  style?: any;
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    const fallbackText = tKey.split(".").pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
};

export default function Step01_SelectPlant({
  onScrollToTop,
  onOpenScanner,
  onRegisterScanResultHandler,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const navigation = useNavigation<any>();
  const { state, actions } = useCreatePlantWizard();

  const initialQuery = useMemo(() => {
    const fromState =
      (state as any).plantQuery?.trim?.() ||
      pickName((state as any).selectedPlant).trim() ||
      "";
    return fromState;
  }, [state]);

  const [query, setQuery] = useState<string>(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [popular, setPopular] = useState<PopularPlant[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [errorPopular, setErrorPopular] = useState<string | null>(null);

  const [searchIndex, setSearchIndex] = useState<Suggestion[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(true);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);

  // Safe translation function that uses both hooks
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        void currentLanguage;
        const translation = t(key);
        return translation || fallback || key.split(".").pop() || key;
      } catch (error) {
        console.warn("Translation error for key:", key, error);
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPopular(true);
        setLoadingSearch(true);

        const [popularRes, searchRes] = await Promise.all([
          fetchPopularPlants({ auth: true }),
          fetchPlantSearchIndex({ auth: true }),
        ]);
        if (!mounted) return;

        setPopular(popularRes as any);
        setSearchIndex(searchRes);

        setErrorPopular(null);
        setErrorSearch(null);
      } catch (e: any) {
        if (!mounted) return;
        setErrorPopular(
          e?.message ??
            getTranslation(
              "createPlant.step01.errorPopular",
              "Failed to load popular plants"
            )
        );
        setErrorSearch(
          e?.message ??
            getTranslation(
              "createPlant.step01.errorSearch",
              "Failed to load plant search"
            )
        );
      } finally {
        if (mounted) {
          setLoadingPopular(false);
          setLoadingSearch(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getTranslation]);

  const onSelectFromSearch = (item: Suggestion) => {
    const name = pickName(item);

    setQuery(name);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: item.id,
      name,
      latin: item.latin,
      predefined: true,
    });
  };

  const onPickPopular = (item: PopularPlant) => {
    const name = pickName(item);

    setQuery(name);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: (item as any).id,
      name,
      latin: (item as any).latin,
      predefined: true,
    });
    onScrollToTop();
  };

  const onScanPlantDetected = useCallback(
    (item: Suggestion) => {
      const name = pickName(item);

      setQuery(name);
      setShowSuggestions(false);
      actions.setSelectedPlant({
        id: item.id,
        name,
        latin: item.latin,
        predefined: false,
      });
      onScrollToTop();
    },
    [actions, onScrollToTop]
  );

  useEffect(() => {
    onRegisterScanResultHandler(onScanPlantDetected);
  }, [onRegisterScanResultHandler, onScanPlantDetected]);

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass} pointerEvents="none">
        {/* Base green gradient (AuthCard-style) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (AuthCard-style) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(255, 255, 255, 0.08)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <TranslatedText tKey="createPlant.step01.title" style={wiz.title} />

        <TranslatedText tKey="createPlant.step01.subtitle" style={wiz.subtitle} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          <Pressable
            onPress={onOpenScanner}
            style={{
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.16)",
              overflow: "hidden",
            }}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={getTranslation("createPlant.step01.scanButton", "Scan plant")}
          >
            <MaterialCommunityIcons name="image-search-outline" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <PlantSearchBox
              value={query}
              onChange={(t) => {
                const next = typeof t === "string" ? t : "";
                setQuery(next);
                setShowSuggestions(!!next.trim());
                if (!next.trim()) actions.setSelectedPlant(undefined);
              }}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              onSelectSuggestion={onSelectFromSearch}
              suggestions={searchIndex}
              placeholder={getTranslation(
                "createPlant.step01.searchPlaceholder",
                "Search for a plant..."
              )}
            />
          </View>
        </View>

        <TranslatedText tKey="createPlant.step01.popularPlants" style={wiz.sectionTitle} />

        {loadingPopular ? (
          <View style={{ paddingVertical: 8 }}>
            <ActivityIndicator />
          </View>
        ) : errorPopular ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd" }]}>{errorPopular}</Text>
        ) : popular.length > 0 ? (
          <View style={{ paddingTop: 6, paddingBottom: 6 }}>
            {popular.map((item, idx) => {
              const displayName = pickName(item);
              return (
                <View
                  key={(item as any).id ?? `${idx}`}
                  style={{ marginBottom: idx === popular.length - 1 ? 0 : 10 }}
                >
                  <Pressable style={wiz.rowItem} onPress={() => onPickPopular(item)}>
                    <SafeImage uri={(item as any).image} style={wiz.thumb} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={wiz.rowName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={wiz.rowLatin} numberOfLines={1}>
                        {(item as any).latin}
                      </Text>

                      <View style={[wiz.tagRow, { gap: 12 }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <MaterialCommunityIcons
                            name={SUN_ICON_BY_LEVEL[(item as any).sun]}
                            size={16}
                            color="rgba(255,255,255,0.95)"
                          />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.95)",
                              fontWeight: "700",
                              fontSize: 12,
                            }}
                          >
                            {SUN_LABEL_BY_LEVEL[(item as any).sun]}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <MaterialCommunityIcons
                            name={WATER_ICON_BY_LEVEL[(item as any).water]}
                            size={16}
                            color="rgba(255,255,255,0.95)"
                          />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.95)",
                              fontWeight: "700",
                              fontSize: 12,
                            }}
                          >
                            {WATER_LABEL_BY_LEVEL[(item as any).water]}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <MaterialCommunityIcons
                            name={DIFFICULTY_ICON_BY_LEVEL[(item as any).difficulty]}
                            size={16}
                            color="rgba(255,255,255,0.95)"
                          />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.95)",
                              fontWeight: "700",
                              fontSize: 12,
                            }}
                          >
                            {DIFFICULTY_LABEL_BY_LEVEL[(item as any).difficulty]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[wiz.subtitle, { color: "rgba(255,255,255,0.7)" }]}>
            {getTranslation("createPlant.step01.noPlantsAvailable", "No plants available")}
          </Text>
        )}

        {errorSearch ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 6 }]}>{errorSearch}</Text>
        ) : null}
      </View>
    </View>
  );
}
