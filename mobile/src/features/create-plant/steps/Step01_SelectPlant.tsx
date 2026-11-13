import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  Text,
  Animated,
  Easing, AnimatedView, StyleSheet } from "../../../shared/theme/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { fetchPopularPlants, fetchPlantSearchIndex } from "../../../api/services/plant-definitions.service";
import LinearGradient from "../../../shared/theme/Gradient";

import { wiz } from "../styles/wizard.styles";
import PlantSearchBox from "../components/PlantSearchBox";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import type { PopularPlant, Suggestion } from "../types/create-plant.types";
import SafeImage from "../../../shared/ui/SafeImage";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import { useWizardImagePreload } from "../hooks/useWizardImagePreload";

import PlantDescriptionSurface from '../../../shared/ui/PlantDescriptionSurface';
import { ThemeContrastScope } from '../../../shared/theme/ThemeContext';
import { PHOTO_PLANTS_GRID_ASPECT_RATIO } from '../../../shared/utils/photoFraming';

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

// EXACT SAME blue as PreviousNextBar next button
const CTA_BLUE = "#0B7285";

type Props = {
  onScrollToTop: () => void;
  onOpenScanner: () => void;
  onRegisterScanResultHandler: (fn: (plant: Suggestion) => void) => void;
  onReadyChange?: (ready: boolean) => void;
};

function pickName(item: any): string {
  if (!item) return "";
  const v = item?.name ?? item?.display_name ?? item?.displayName ?? item?.title ?? "";
  return typeof v === "string" ? v : String(v);
}

function formatPlantName(name: string): string {
  return name.replace(/_/g, " ");
}

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
  onReadyChange,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { state, actions } = useCreatePlantWizard();

  const initialQuery = useMemo(() => {
    const fromState = (state as any).plantQuery?.trim?.() || "";

    const latinRaw = String((state as any).selectedPlant?.latin ?? "").trim();
    const latinDisplay = latinRaw ? latinRaw.replace(/_/g, " ") : "";

    if (fromState) return fromState;
    if (latinDisplay) return latinDisplay;

    const fallbackName = pickName((state as any).selectedPlant).trim() || "";
    return fallbackName;
  }, [state]);

  const [query, setQuery] = useState<string>(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [popular, setPopular] = useState<PopularPlant[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [errorPopular, setErrorPopular] = useState<string | null>(null);

  const [searchIndex, setSearchIndex] = useState<Suggestion[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(true);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);
  const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);
  const dataLoading = loadingPopular || loadingSearch || loadedLanguage !== (currentLanguage || "");
  const imageUris = useMemo(() => errorPopular ? [] : popular.map(item => (item as any).image as string | undefined), [popular, errorPopular]);
  const images = useWizardImagePreload(imageUris, !dataLoading);
  const ready = !dataLoading && !images.loading;
  useEffect(() => { onReadyChange?.(ready); }, [onReadyChange, ready]);

  // Pulse animation for ML scanner button
  const scanPulse = useRef(new Animated.Value(0)).current;
  const scanPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    scanPulseLoopRef.current?.stop();
    scanPulseLoopRef.current = null;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanPulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    scanPulseLoopRef.current = loop;
    loop.start();

    return () => loop.stop();
  }, [scanPulse]);

  const getTranslation = useCallback((key: string, fallback?: string): string => {
    try {
      const lang = currentLanguage;
      const translation = t(key);
      return translation || fallback || key.split(".").pop() || key;
    } catch (error) {
      console.warn("Translation error for key:", key, error);
      return fallback || key.split(".").pop() || key;
    }
  }, [t, currentLanguage]);

  React.useEffect(() => {
    console.log("Step01_SelectPlant rendering with language:", currentLanguage);
  }, [currentLanguage]);

  useFocusEffect(
    React.useCallback(() => {
      setQuery(initialQuery);
      setShowSuggestions(false);
      return () => {};
    }, [initialQuery])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPopular(true);
        setLoadingSearch(true);

        const [popularRes, searchRes] = await Promise.all([
          fetchPopularPlants({ lang: currentLanguage, auth: true }),
          fetchPlantSearchIndex({ lang: currentLanguage, auth: true }),
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
            getTranslation("createPlant.step01.errorPopular", "Failed to load popular plants")
        );
        setErrorSearch(
          e?.message ??
            getTranslation("createPlant.step01.errorSearch", "Failed to load plant search")
        );
      } finally {
        if (mounted) {
          setLoadingPopular(false);
          setLoadingSearch(false);
          setLoadedLanguage(currentLanguage || "");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [getTranslation, currentLanguage]);

  const onSelectFromSearch = (item: Suggestion) => {
    const latinName = item.latin;
    setQuery(latinName);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: item.id,
      name: latinName,
      latin: latinName,
      predefined: true,
    });
  };

  const onPickPopular = (item: PopularPlant) => {
    const latinName = (item as any).latin;

    setQuery(latinName);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: (item as any).id,
      name: latinName,
      latin: latinName,
      predefined: true,
    });
    onScrollToTop();
    actions.goTo("traits");
  };

  const onScanPlantDetected = useCallback(
    (plant: Suggestion) => {
      const formattedLatin = plant.latin.replace(/_/g, " ");
      setQuery(formattedLatin);
      setShowSuggestions(false);

      actions.setSelectedPlant({
        id: plant.id,
        name: formattedLatin,
        latin: plant.latin,
        predefined: false,
      });

      onScrollToTop();
      actions.goTo("traits");
    },
    [actions, onScrollToTop]
  );

  useEffect(() => {
    onRegisterScanResultHandler(onScanPlantDetected);
  }, [onRegisterScanResultHandler, onScanPlantDetected]);

  if (!ready) return <CenteredSpinner />;

  return (
    <View>
      <View style={[wiz.cardWrap, styles.mainTile]}>
      <View style={wiz.cardGlass} pointerEvents="none">
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={{ position: "absolute", inset: 0, borderRadius: 28 } as any}
        />

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
          style={{ position: "absolute", inset: 0 } as any}
        />

        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

        <View style={wiz.cardInner}>
          <TranslatedText tKey="createPlant.step01.title" style={wiz.title} />
          <TranslatedText tKey="createPlant.step01.subtitle" style={wiz.subtitle} />
          <View style={styles.controls}>
            <ThemeContrastScope kind="accent">
              <Pressable
                onPress={onOpenScanner}
                style={styles.scanButton}
                accessibilityRole="button"
                accessibilityLabel={getTranslation("createPlant.step01.scanButton", "Scan a plant")}
              >
                <AnimatedView pointerEvents="none" style={[StyleSheet.absoluteFill, {
                  backgroundColor: '#168498',
                  opacity: scanPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.75] }),
                }]} />
                <MaterialCommunityIcons name="image-search-outline" size={22} color="#FFFFFF" />
                <Text style={styles.scanText}>
                  {getTranslation("createPlant.step01.scanButton", "Scan a plant")}
                </Text>
              </Pressable>
            </ThemeContrastScope>
            <PlantSearchBox
              value={query}
              onChange={text => {
                const next = typeof text === "string" ? text : "";
                setQuery(next);
                setShowSuggestions(!!next.trim());
                if (!next.trim()) actions.setSelectedPlant(undefined);
              }}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              onSelectSuggestion={onSelectFromSearch}
              suggestions={searchIndex}
              placeholder={getTranslation("createPlant.step01.searchPlaceholder", "Search plant")}
            />
          </View>
          {!!errorSearch && <Text style={[wiz.subtitle, styles.error]}>{errorSearch}</Text>}
        </View>
      </View>

      <TranslatedText tKey="createPlant.step01.popularPlants" style={[wiz.sectionTitle, styles.popularHeading]} />
      {errorPopular ? (
        <Text style={[wiz.subtitle, styles.error]}>{errorPopular}</Text>
      ) : popular.length ? (
        <View style={styles.grid}>
          {popular.map(item => (
            <Pressable
              key={String(item.id)}
              testID={`popular-plant-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={pickName(item)}
              onPress={() => onPickPopular(item)}
              style={styles.plantTile}
            >
              <SafeImage uri={item.image} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <View pointerEvents="none" style={styles.imageSpace} />
              <View style={styles.plantDescription}>
                <PlantDescriptionSurface />
                <Text style={styles.plantName} numberOfLines={2}>{pickName(item)}</Text>
                <Text style={styles.plantLatin} numberOfLines={2}>{formatPlantName(item.latin)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={wiz.subtitle}>{getTranslation("createPlant.step01.noPlantsAvailable", "No plants available")}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainTile: { zIndex: 10 },
  controls: { gap: 12, marginTop: 12 },
  scanButton: {
    width: '100%', height: 46, paddingHorizontal: 14, gap: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: CTA_BLUE, overflow: 'hidden',
  },
  scanText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  popularHeading: { marginTop: 0, marginBottom: 12, marginLeft: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  plantTile: { width: '48.5%', borderRadius: 22, overflow: 'hidden' },
  imageSpace: { width: '100%', aspectRatio: PHOTO_PLANTS_GRID_ASPECT_RATIO },
  plantDescription: {
    marginTop: -26, paddingHorizontal: 11, paddingTop: 9, paddingBottom: 10,
    minHeight: 66, flexGrow: 1, justifyContent: 'center', borderTopLeftRadius: 19, borderTopRightRadius: 19,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22, overflow: 'hidden',
  },
  plantName: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  plantLatin: { color: 'rgba(255,255,255,0.9)', fontSize: 11, lineHeight: 15, fontStyle: 'italic', marginTop: 2 },
  error: { color: '#FFDDDD' },
});
