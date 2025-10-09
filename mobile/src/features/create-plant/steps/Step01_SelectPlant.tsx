import React, { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { POPULAR_PLANTS } from "../constants/create-plant.constants";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import PlantSearchBox from "../components/PlantSearchBox";

export default function Step01_SelectPlant({
  onScrollToTop,
}: {
  onScrollToTop: () => void;
}) {
  const { state, actions } = useCreatePlantWizard();

  const [query, setQuery] = useState(state.plantQuery || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const onSelectFromSearch = (name: string, latin?: string) => {
    setQuery(name);
    setShowSuggestions(false);
    actions.setSelectedPlant({ name, latin, predefined: true });
  };

  const onPickPopular = (name: string, latin?: string) => {
    setQuery(name);
    setShowSuggestions(false); // popular is a shortcut, do not open dropdown
    actions.setSelectedPlant({ name, latin, predefined: true });
    onScrollToTop(); // ensure Next is visible
  };

  const onNext = () => {
    if (!query.trim()) return;
    actions.setPlantQuery(query.trim());
    actions.goNext();
  };

  return (
    <View style={wiz.cardWrap}>
      {/* Glass background */}
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
          This step is optional. Picking a predefined plant helps us propose watering, moisture and other care actions.
        </Text>

        {/* Search */}
        <PlantSearchBox
          value={query}
          onChange={(t) => {
            setQuery(t);
            setShowSuggestions(!!t.trim());
          }}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          onSelectSuggestion={onSelectFromSearch}
        />

        {/* Next button under the search (50% width, right-aligned) */}
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

        {/* Popular plants — simple mapped rows (no FlatList to avoid nested VirtualizedList warning) */}
        <Text style={wiz.sectionTitle}>Popular plants</Text>
        <View style={{ paddingTop: 6, paddingBottom: 6 }}>
          {POPULAR_PLANTS.map((item, idx) => (
            <View key={item.id} style={{ marginBottom: idx === POPULAR_PLANTS.length - 1 ? 0 : 10 }}>
              <Pressable style={wiz.rowItem} onPress={() => onPickPopular(item.name, item.latin)}>
                <Image source={{ uri: item.image }} style={wiz.thumb} />
                <View style={{ flex: 1 }}>
                  <Text style={wiz.rowName} numberOfLines={1}>{item.name}</Text>
                  <Text style={wiz.rowLatin} numberOfLines={1}>{item.latin}</Text>
                  <View style={wiz.tagRow}>
                    {item.tags.map((icon) => (
                      <MaterialCommunityIcons
                        key={icon}
                        name={icon}
                        size={16}
                        color="rgba(255,255,255,0.95)"
                        style={{ marginRight: 8 }}
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
