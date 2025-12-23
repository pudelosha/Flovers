import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { TRAIT_ICON_BY_KEY, TRAIT_LABEL_BY_KEY } from "../constants/create-plant.constants";
import SafeImage from "../../../shared/ui/SafeImage";

import {
  fetchPlantProfile,
  fetchPlantSearchIndex,
} from "../../../api/services/plant-definitions.service";
import type { PlantProfile, Suggestion } from "../types/create-plant.types";

function toNumericIdOrNull(id: unknown): number | null {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
  }
  return null;
}

export default function Step02_PlantTraits() {
  const { state, actions } = useCreatePlantWizard();

  // keep stable ref to avoid effect re-run loops if actions identity changes
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const selected = state.selectedPlant;
  const selectedId = selected?.id;
  const selectedName = selected?.name?.trim() || "";

  const [profile, setProfile] = useState<PlantProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // helper: persist profile in wizard memory if supported
  const persistProfile = (p: PlantProfile) => {
    const a: any = actionsRef.current;

    // preferred (if your wizard has it)
    if (typeof a?.setSelectedPlantDefinition === "function") {
      a.setSelectedPlantDefinition(p);
      return;
    }

    // fallback: at least keep selected plant synced (no extra logic changed)
    if (typeof a?.setSelectedPlant === "function") {
      a.setSelectedPlant({
        ...(selected ?? {}),
        id: (p as any)?.id ?? selected?.id,
        name: (p as any)?.name ?? selected?.name,
        latin: (p as any)?.latin ?? selected?.latin,
        predefined: selected?.predefined ?? true,
      });
    }
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) If we have an id already -> fetch directly.
        // IMPORTANT: number => /<id>/profile/, string => /by-key/<external_id>/profile/
        if (selectedId) {
          const numericId = toNumericIdOrNull(selectedId);
          const p = await fetchPlantProfile(
            numericId !== null ? numericId : String(selectedId),
            { auth: true }
          );
          if (!alive) return;

          setProfile(p);
          persistProfile(p);
          return;
        }

        // 2) If we only have a name -> find best match from index, then fetch profile
        if (selectedName) {
          const all: Suggestion[] = await fetchPlantSearchIndex({ auth: true });
          const q = selectedName.toLowerCase();

          const hit =
            all.find((s) => s.name.toLowerCase() === q) ||
            all.find((s) => s.latin.toLowerCase() === q) ||
            all.find((s) => s.name.toLowerCase().includes(q) || s.latin.toLowerCase().includes(q));

          if (hit?.id) {
            const hitNumeric = toNumericIdOrNull(hit.id);
            const p = await fetchPlantProfile(
              hitNumeric !== null ? hitNumeric : String(hit.id),
              { auth: true }
            );
            if (!alive) return;

            setProfile(p);
            persistProfile(p);
            return;
          }
        }

        // If nothing selected (shouldn't normally happen if you reached Step2)
        if (!alive) return;
        setProfile(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load plant profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // do not depend on `actions`
  }, [selectedId, selectedName, selected?.latin]);

  /**
   * Build a live "Preferences" list from backend profile fields.
   * If backend starts returning `traits` list later, it will show too.
   */
  const preferences = useMemo(() => {
    const out: Array<{ key: string; label: string; icon: string; value: string }> = [];

    const p: any = profile;

    // 1) Use backend traits if present
    const traits = Array.isArray(p?.traits) ? p.traits : [];
    for (const t of traits) {
      const key = String(t?.key ?? "");
      const value = t?.value != null ? String(t.value) : "";
      if (!key || !value) continue;

      out.push({
        key,
        label: (TRAIT_LABEL_BY_KEY as any)[key] ?? key,
        icon: (TRAIT_ICON_BY_KEY as any)[key] ?? "leaf",
        value,
      });
    }

    // 2) Add live core fields even if traits empty
    if (p?.sun) {
      out.push({
        key: "sun",
        label: (TRAIT_LABEL_BY_KEY as any)["sun"] ?? "Sun",
        icon: (TRAIT_ICON_BY_KEY as any)["sun"] ?? "white-balance-sunny",
        value: String(p.sun),
      });
    }

    if (p?.water) {
      out.push({
        key: "water",
        label: (TRAIT_LABEL_BY_KEY as any)["water"] ?? "Water",
        icon: (TRAIT_ICON_BY_KEY as any)["water"] ?? "water",
        value: String(p.water),
      });
    }

    if (p?.difficulty) {
      out.push({
        key: "difficulty",
        label: (TRAIT_LABEL_BY_KEY as any)["difficulty"] ?? "Difficulty",
        icon: (TRAIT_ICON_BY_KEY as any)["difficulty"] ?? "arm-flex",
        value: String(p.difficulty),
      });
    }

    // 3) Add recommended pot/soil mixes (live)
    const pots = Array.isArray(p?.recommended_pot_materials) ? p.recommended_pot_materials : [];
    if (pots.length) {
      out.push({
        key: "recommended_pot_materials",
        label: "Pot materials",
        icon: "cup-outline",
        value: pots.join(", "),
      });
    }

    const soils = Array.isArray(p?.recommended_soil_mixes) ? p.recommended_soil_mixes : [];
    if (soils.length) {
      out.push({
        key: "recommended_soil_mixes",
        label: "Soil mixes",
        icon: "shovel",
        value: soils.join(", "),
      });
    }

    // 4) Add live intervals (only if required flag true)
    if (p?.water_required && p?.water_interval_days != null) {
      out.push({
        key: "water_interval_days",
        label: "Watering",
        icon: "watering-can",
        value: `Every ${p.water_interval_days} days`,
      });
    }

    if (p?.moisture_required && p?.moisture_interval_days != null) {
      out.push({
        key: "moisture_interval_days",
        label: "Moisture check",
        icon: "water-percent",
        value: `Every ${p.moisture_interval_days} days`,
      });
    }

    if (p?.fertilize_required && p?.fertilize_interval_days != null) {
      out.push({
        key: "fertilize_interval_days",
        label: "Fertilize",
        icon: "sprout",
        value: `Every ${p.fertilize_interval_days} days`,
      });
    }

    if (p?.repot_required && p?.repot_interval_months != null) {
      out.push({
        key: "repot_interval_months",
        label: "Repot",
        icon: "flower-pot",
        value: `Every ${p.repot_interval_months} months`,
      });
    }

    return out;
  }, [profile]);

  return (
    <View style={wiz.cardWrap}>
      {/* glass */}
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
        <Text style={[wiz.title, { marginBottom: 6 }]}>
          {selectedName ? `${selectedName}` : "Plant profile"}
        </Text>

        {/* show spinner only if we have nothing to show yet */}
        {loading && !profile ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginBottom: 10 }]}>
            {error}
          </Text>
        ) : null}

        {!!profile && (
          <SafeImage uri={(profile as any)?.image} resizeMode="cover" style={wiz.hero} />
        )}

        {!!(profile as any)?.description && (
          <Text style={wiz.desc}>{(profile as any).description}</Text>
        )}

        {!!profile && (
          <>
            <Text style={wiz.sectionTitle}>Preferences</Text>
            <View style={wiz.prefsGrid}>
              {preferences.map((row) => (
                <View key={row.key} style={wiz.prefRow}>
                  <MaterialCommunityIcons name={row.icon as any} size={18} color="#FFFFFF" />
                  <Text style={wiz.prefLabel}>{row.label}</Text>
                  <Text style={wiz.prefValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}
