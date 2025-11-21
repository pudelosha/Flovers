// steps/Step01_SelectPlant.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

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
  freshOpen?: boolean;
  onCleared?: () => void;

  // open scanner modal at screen level
  onOpenScanner: () => void;

  // register handler that receives recognized plant from modal
  onRegisterScanResultHandler: (fn: (plant: Suggestion) => void) => void;
};

export default function Step01_SelectPlant({
  onScrollToTop,
  freshOpen = false,
  onCleared,
  onOpenScanner,
  onRegisterScanResultHandler,
}: Props) {
  const navigation = useNavigation<any>(); // kept in case used elsewhere
  const { state, actions } = useCreatePlantWizard();

  const initialQuery = useMemo(
    () => state.plantQuery?.trim() || state.selectedPlant?.name?.trim() || "",
    [state.plantQuery, state.selectedPlant?.name]
  );

  const [query, setQuery] = useState<string>(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  useEffect(() => {
    if (freshOpen) {
      actions.reset();
      setQuery("");
      setShowSuggestions(false);
      onCleared?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshOpen]);

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
        setErrorPopular(e?.message ?? "Failed to load popular plants.");
        setErrorSearch(e?.message ?? "Failed to load plant list.");
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
  }, []);

  const onSelectFromSearch = (item: Suggestion) => {
    setQuery(item.name);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: item.id,
      name: item.name,
      latin: item.latin,
      predefined: true,
    });
  };

  const onPickPopular = (item: PopularPlant) => {
    setQuery(item.name);
    setShowSuggestions(false);
    actions.setSelectedPlant({
      id: item.id,
      name: item.name,
      latin: item.latin,
      predefined: true,
    });
    onScrollToTop();
  };

  // local handler for recognized plant (used by modal via registration)
  const onScanPlantDetected = useCallback(
    (item: Suggestion) => {
      setQuery(item.name);
      setShowSuggestions(false);
      actions.setSelectedPlant({
        id: item.id,
        name: item.name,
        latin: item.latin,
        predefined: true,
      });
      onScrollToTop();
    },
    [actions, onScrollToTop]
  );

  // register this handler with the parent (screen)
  useEffect(() => {
    onRegisterScanResultHandler(onScanPlantDetected);
  }, [onRegisterScanResultHandler, onScanPlantDetected]);

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Select a plant</Text>
        <Text style={wiz.subtitle}>
          You can search our full plant library, pick from the popular list, or scan a
          plant using your camera. You can also skip this step, but selecting a plant
          lets us automatically suggest care tasks like watering for you.
        </Text>

        {/* Scan + Search row – both 64 high */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          {/* Scan button */}
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
            accessibilityLabel="Scan Plant"
          >
            <MaterialCommunityIcons
              name="image-search-outline"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          {/* Search field */}
          <View style={{ flex: 1 }}>
            <PlantSearchBox
              value={query}
              onChange={(t) => {
                setQuery(t);
                setShowSuggestions(!!t.trim());
                if (!t.trim()) actions.setSelectedPlant(undefined);
              }}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              onSelectSuggestion={onSelectFromSearch}
              suggestions={searchIndex}
            />
          </View>
        </View>

        {/* Popular plants */}
        <Text style={wiz.sectionTitle}>Popular plants</Text>
        {loadingPopular ? (
          <View style={{ paddingVertical: 8 }}>
            <ActivityIndicator />
          </View>
        ) : errorPopular ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd" }]}>{errorPopular}</Text>
        ) : (
          <View style={{ paddingTop: 6, paddingBottom: 6 }}>
            {popular.map((item, idx) => (
              <View
                key={item.id}
                style={{ marginBottom: idx === popular.length - 1 ? 0 : 10 }}
              >
                <Pressable
                  style={wiz.rowItem}
                  onPress={() => onPickPopular(item)}
                >
                  <SafeImage uri={item.image} style={wiz.thumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={wiz.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={wiz.rowLatin} numberOfLines={1}>
                      {item.latin}
                    </Text>

                    {/* 3 requirement icons + tiny labels */}
                    <View style={[wiz.tagRow, { gap: 12 }]}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={SUN_ICON_BY_LEVEL[item.sun]}
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
                          {SUN_LABEL_BY_LEVEL[item.sun]}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={WATER_ICON_BY_LEVEL[item.water]}
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
                          {WATER_LABEL_BY_LEVEL[item.water]}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={DIFFICULTY_ICON_BY_LEVEL[item.difficulty]}
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
                          {DIFFICULTY_LABEL_BY_LEVEL[item.difficulty]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {errorSearch && (
          <Text
            style={[
              wiz.subtitle,
              { color: "#ffdddd", marginTop: 6 },
            ]}
          >
            {errorSearch}
          </Text>
        )}
      </View>
    </View>
  );
}
