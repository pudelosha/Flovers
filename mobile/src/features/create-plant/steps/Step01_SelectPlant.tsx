import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import PlantSearchBox from "../components/PlantSearchBox";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { fetchPopularPlants } from "../../../api/services/plants.service";
import type { PopularPlant } from "../types/create-plant.types";
// add to imports
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
}: {
  onScrollToTop: () => void;
}) {
  const { state, actions } = useCreatePlantWizard();

  const [query, setQuery] = useState(state.plantQuery || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [popular, setPopular] = useState<PopularPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Load "Popular plants" on mount (from backend) ----
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const items = await fetchPopularPlants();
        if (mounted) {
          setPopular(items);
          setError(null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load popular plants.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSelectFromSearch = (name: string, latin?: string) => {
    setQuery(name);
    setShowSuggestions(false);
    actions.setSelectedPlant({ name, latin, predefined: true });
  };

  const onPickPopular = (item: PopularPlant) => {
    setQuery(item.name);
    setShowSuggestions(false); // do not open dropdown
    actions.setSelectedPlant({ name: item.name, latin: item.latin, predefined: true });
    onScrollToTop();
  };

  // 🔵 OPTIONAL STEP BEHAVIOR:
  // - If a predefined plant was picked -> go to Step 2 ("traits")
  // - If not selected (empty or free text) -> skip to Step 3 ("location")
  const onNext = () => {
    actions.setPlantQuery(query.trim());
    const hasPredefined = !!state.selectedPlant?.predefined && !!state.selectedPlant?.name;
    if (hasPredefined) {
      actions.goNext(); // Step 2: traits (summary of selected plant)
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

        {/* Search */}
        <PlantSearchBox
          value={query}
          onChange={(t) => {
            setQuery(t);
            setShowSuggestions(!!t.trim());
            // Free typing shouldn't mark a "predefined" selection
            if (!t.trim()) actions.setSelectedPlant(undefined);
          }}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          onSelectSuggestion={onSelectFromSearch}
        />

        {/* Next button (right, 50% width) */}
        <View style={wiz.footerRow}>
          <Pressable
            onPress={onNext}
            style={[wiz.nextBtnWide, { width: "50%", alignSelf: "flex-end", paddingHorizontal: 14 }]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* Popular plants (loaded from backend) */}
        <Text style={wiz.sectionTitle}>Popular plants</Text>
        {loading ? (
          <View style={{ paddingVertical: 8 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd" }]}>{error}</Text>
        ) : (
          <View style={{ paddingTop: 6, paddingBottom: 6 }}>
            {popular.map((item, idx) => (
              <View key={item.id} style={{ marginBottom: idx === popular.length - 1 ? 0 : 10 }}>
                <Pressable style={wiz.rowItem} onPress={() => onPickPopular(item)}>
                  <Image source={{ uri: item.image }} style={wiz.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={wiz.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={wiz.rowLatin} numberOfLines={1}>{item.latin}</Text>

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
      </View>
    </View>
  );
}
