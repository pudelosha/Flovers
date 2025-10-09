import React from "react";
import { Image, Pressable, Text, View, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  PLANT_PROFILES_MOCK,
  TRAIT_ICON_BY_KEY,
  TRAIT_LABEL_BY_KEY,
} from "../constants/create-plant.constants";

export default function Step02_PlantTraits() {
  const { state, actions } = useCreatePlantWizard();

  const selectedName = state.selectedPlant?.name;
  const profile =
    (selectedName && PLANT_PROFILES_MOCK[selectedName]) || PLANT_PROFILES_MOCK.generic;

  const onPrev = () => actions.goPrev();
  const onNext = () => actions.goNext(); // goes to "location"

  return (
    <View style={wiz.cardWrap}>
      {/* glass */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]}
        />
      </View>

      <View style={wiz.cardInner}>
        {/* Plant name with a bit of spacing below (no subtitle) */}
        <Text style={[wiz.title, { marginBottom: 6 }]}>
          {selectedName ? `${selectedName}` : "Plant profile"}
        </Text>

        {/* hero image */}
        <Image source={{ uri: profile.image }} resizeMode="cover" style={wiz.hero} />

        {/* description */}
        <Text style={wiz.desc}>{profile.description}</Text>

        {/* buttons under description */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch" }]}>
        {/* Previous (left side, left arrow) */}
        <Pressable
            onPress={onPrev}
            style={[wiz.btn, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 8 }]}
        >
            <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
            <Text style={wiz.btnText}>Previous</Text>
        </Pressable>

        {/* Next (right side, right-aligned text + arrow) */}
        <Pressable
            onPress={onNext}
            style={[wiz.btn, wiz.btnPrimary, { flex: 1, paddingHorizontal: 14 }]}
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%" }}>
            <Text style={wiz.btnText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
        </Pressable>
        </View>

        {/* preferences grid */}
        <Text style={wiz.sectionTitle}>Preferences</Text>
        <View style={wiz.prefsGrid}>
          {profile.traits.map((t, idx) => (
            <View key={`${t.key}-${idx}`} style={wiz.prefRow}>
              <MaterialCommunityIcons
                name={TRAIT_ICON_BY_KEY[t.key]}
                size={18}
                color="#FFFFFF"
              />
              <Text style={wiz.prefLabel}>{TRAIT_LABEL_BY_KEY[t.key]}</Text>
              <Text style={wiz.prefValue}>{t.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
