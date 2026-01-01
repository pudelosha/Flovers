import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  View, 
  Pressable, 
  ActivityIndicator,
  Text
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

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

export default function Step01_SelectPlant({
  onScrollToTop,
  onOpenScanner,
  onRegisterScanResultHandler,
}: Props) {
  const { t, i18n } = useTranslation();
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
        setErrorPopular(e?.message ?? t('createPlant.step01.errorPopular'));
        setErrorSearch(e?.message ?? t('createPlant.step01.errorSearch'));
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
  }, [t]);

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

  useEffect(() => {
  }, [query]);

  useEffect(() => {
  }, [(state as any)?.selectedPlant]);

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass} pointerEvents="none">
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
          pointerEvents="none"
        />
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>{t('createPlant.step01.title')}</Text>
        <Text style={wiz.subtitle}>
          {t('createPlant.step01.subtitle')}
        </Text>

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
            accessibilityLabel={t('createPlant.step01.scanButton')}
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
              placeholder={t('createPlant.step01.searchPlaceholder')}
            />
          </View>
        </View>

        <Text style={wiz.sectionTitle}>{t('createPlant.step01.popularPlants')}</Text>
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
            {t('createPlant.step01.noPlantsAvailable')}
          </Text>
        )}

        {errorSearch ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 6 }]}>
            {errorSearch}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
