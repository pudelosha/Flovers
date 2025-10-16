// steps/Step01_SelectPlant.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

import { wiz } from "../styles/wizard.styles";
import PlantSearchBox from "../components/PlantSearchBox";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { fetchPopularPlants, fetchPlantSearchIndex } from "../../../api/services/plant-definitions.service";
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

export default function Step01_SelectPlant({
  onScrollToTop,
  freshOpen = false,
  onCleared,
}: {
  onScrollToTop: () => void;
  /** true only right after the wizard screen is opened */
  freshOpen?: boolean;
  /** called after we clear once so the parent can drop the flag */
  onCleared?: () => void;
}) {
  const navigation = useNavigation<any>();
  const { state, actions } = useCreatePlantWizard();

  // Initial query: hydrate from store (useful when navigating back),
  // but if this is a fresh open, we'll clear it immediately in the effect below.
  const initialQuery = useMemo(
    () => state.plantQuery?.trim() || state.selectedPlant?.name?.trim() || "",
    [state.plantQuery, state.selectedPlant?.name]
  );

  const [query, setQuery] = useState<string>(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false); // start closed

  // Clear once if the wizard has just been opened and Step 1 is displayed
  useEffect(() => {
    if (freshOpen) {
      actions.reset();              // clear entire wizard store
      setQuery("");                 // clear local input
      setShowSuggestions(false);    // keep dropdown closed
      onCleared?.();                // tell parent we handled the fresh open
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

  const onNext = () => {
    actions.setPlantQuery(query.trim());
    const hasPredefined = !!state.selectedPlant?.predefined && !!state.selectedPlant?.name;
    if (hasPredefined) {
      actions.goNext(); // Step 2
    } else {
      actions.goTo("location"); // skip Step 2
    }
  };

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.12)" } as any}
        />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Select a plant</Text>
        <Text style={wiz.subtitle}>
          Optional step — you can pick a known plant to auto-prefill care, or just continue.
        </Text>

        {/* Scan + Search row (compact 48px height) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, marginBottom: 6 }}>
          <Pressable
            onPress={() => navigation.navigate("Scanner")}
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.16)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
            }}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: false }}
            accessibilityRole="button"
            accessibilityLabel="Scan Plant"
          >
            <MaterialCommunityIcons name="image-search-outline" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Search (compact) */}
          <View style={{ flex: 1 }}>
            <PlantSearchBox
              compact
              value={query}
              onChange={(t) => {
                setQuery(t);
                setShowSuggestions(!!t.trim()); // open only when user types
                if (!t.trim()) actions.setSelectedPlant(undefined);
              }}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              onSelectSuggestion={onSelectFromSearch}
              suggestions={searchIndex}
            />
          </View>
        </View>

        {/* Next button */}
        <View style={wiz.footerRow}>
          <Pressable
            onPress={onNext}
            style={[wiz.nextBtnWide, { width: "50%", alignSelf: "flex-end", paddingHorizontal: 14 }]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                width: "100%",
              }}
            >
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
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
              <View key={item.id} style={{ marginBottom: idx === popular.length - 1 ? 0 : 10 }}>
                <Pressable style={wiz.rowItem} onPress={() => onPickPopular(item)}>
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MaterialCommunityIcons
                          name={SUN_ICON_BY_LEVEL[item.sun]}
                          size={16}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "700", fontSize: 12 }}>
                          {SUN_LABEL_BY_LEVEL[item.sun]}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MaterialCommunityIcons
                          name={WATER_ICON_BY_LEVEL[item.water]}
                          size={16}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "700", fontSize: 12 }}>
                          {WATER_LABEL_BY_LEVEL[item.water]}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MaterialCommunityIcons
                          name={DIFFICULTY_ICON_BY_LEVEL[item.difficulty]}
                          size={16}
                          color="rgba(255,255,255,0.95)"
                        />
                        <Text style={{ color: "rgba(255,255,255,0.95)", fontWeight: "700", fontSize: 12 }}>
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

        {/* (Optional) show an error about search list */}
        {errorSearch && (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 6 }]}>{errorSearch}</Text>
        )}
      </View>
    </View>
  );
}
