// steps/Step02_PlantTraits.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  PLANT_PROFILES_MOCK,
  TRAIT_ICON_BY_KEY,
  TRAIT_LABEL_BY_KEY,
} from "../constants/create-plant.constants";
import SafeImage from "../../../shared/ui/SafeImage";

import { fetchPlantProfile, fetchPlantSearchIndex } from "../../../api/services/plant-definitions.service";
import type { PlantProfile, Suggestion } from "../types/create-plant.types";

export default function Step02_PlantTraits() {
  const { state, actions } = useCreatePlantWizard();

  const selected = state.selectedPlant;
  const selectedId = selected?.id;
  const selectedName = selected?.name?.trim() || "";

  const [profile, setProfile] = useState<PlantProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const onPrev = () => actions.goPrev();
  const onNext = () => actions.goNext(); // goes to "location"

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) If we have an id from Step 1, use it directly.
        if (selectedId) {
          const p = await fetchPlantProfile(String(selectedId), { auth: true });
          if (!alive) return;
          setProfile(p);
          setLoading(false);
          return;
        }

        // 2) Otherwise try to resolve id via search-index by name/latin (fallback behavior).
        if (selectedName) {
          const all: Suggestion[] = await fetchPlantSearchIndex({ auth: true });
          const q = selectedName.toLowerCase();
          const hit =
            all.find((s) => s.name.toLowerCase() === q) ||
            all.find((s) => s.latin.toLowerCase() === q) ||
            all.find(
              (s) =>
                s.name.toLowerCase().includes(q) ||
                s.latin.toLowerCase().includes(q)
            );
          if (hit?.id) {
            const p = await fetchPlantProfile(String(hit.id), { auth: true });
            if (!alive) return;
            setProfile(p);
            setLoading(false);
            return;
          }
        }

        // 3) Final fallback to mock
        const fallback =
          (selectedName && (PLANT_PROFILES_MOCK as any)[selectedName]) ||
          PLANT_PROFILES_MOCK.generic;
        if (!alive) return;
        setProfile({
          id: undefined,
          name: selectedName || undefined,
          latin: selected?.latin,
          image: fallback.image,
          description: fallback.description,
          traits: fallback.traits?.map((t: any) => ({ key: t.key, value: t.value })) ?? [],
        });
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load plant profile.");
        const fallback =
          (selectedName && (PLANT_PROFILES_MOCK as any)[selectedName]) ||
          PLANT_PROFILES_MOCK.generic;
        setProfile({
          id: undefined,
          name: selectedName || undefined,
          latin: selected?.latin,
          image: fallback.image,
          description: fallback.description,
          traits: fallback.traits?.map((t: any) => ({ key: t.key, value: t.value })) ?? [],
        });
        setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [selectedId, selectedName, selected?.latin]);

  const traits = useMemo(() => (Array.isArray(profile?.traits) ? profile!.traits : []), [profile]);

  return (
    <View style={wiz.cardWrap}>
      {/* glass (match Step 1/3 exactly): blur + white tint + thin border */}
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
        {/* title */}
        <Text style={[wiz.title, { marginBottom: 6 }]}>
          {selectedName ? `${selectedName}` : "Plant profile"}
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginBottom: 10 }]}>{error}</Text>
        ) : null}

        {/* hero image */}
        {!!profile && (
          <SafeImage uri={profile.image} resizeMode="cover" style={wiz.hero} />
        )}

        {/* description */}
        {!!profile && !!profile.description && (
          <Text style={wiz.desc}>{profile.description}</Text>
        )}

        {/* buttons – flat containers, no borders */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch" }]}>
          {/* Previous (glass) */}
          <Pressable
            onPress={onPrev}
            style={[
              wiz.nextBtnWide,
              { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14 },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
              <Text style={wiz.nextBtnText}>Previous</Text>
            </View>
          </Pressable>

          {/* Next (teal) */}
          <Pressable
            onPress={onNext}
            style={[
              wiz.nextBtnWide,
              { flex: 1, backgroundColor: "rgba(11,114,133,0.9)", paddingHorizontal: 14 },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* preferences grid */}
        {!!profile && (
          <>
            <Text style={wiz.sectionTitle}>Preferences</Text>
            <View style={wiz.prefsGrid}>
              {traits.map((t, idx) => (
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
          </>
        )}
      </View>
    </View>
  );
}
