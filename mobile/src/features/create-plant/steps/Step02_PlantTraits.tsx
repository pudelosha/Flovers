// steps/Step02_PlantTraits.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  TRAIT_ICON_BY_KEY,
  TRAIT_LABEL_BY_KEY,
} from "../constants/create-plant.constants";
import SafeImage from "../../../shared/ui/SafeImage";

// Read global settings (same provider used in HomeScreen)
import { useSettings } from "../../../app/providers/SettingsProvider";

// Call API with explicit lang param (so we don’t depend on device Accept-Language yet)
import { request } from "../../../api/client";
import {
  serializePlantProfile,
  serializePlantSuggestion,
  type ApiPlantProfile,
  type ApiPlantSuggestion,
} from "../../../api/serializers/plant-definitions.serializer";

import type { PlantProfile, Suggestion } from "../types/create-plant.types";

const ENDPOINTS = {
  searchIndex: "/api/plant-definitions/search-index/",
  profile: (idOrKey: string | number) =>
    typeof idOrKey === "number"
      ? `/api/plant-definitions/${idOrKey}/profile/`
      : `/api/plant-definitions/by-key/${idOrKey}/profile/`,
};

function toNumericIdOrNull(id: unknown): number | null {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
  }
  return null;
}

/**
 * Pick a string for the requested language from possible shapes:
 * - string
 * - { text: { en: "...", pl: "..." } }
 * - { en: "...", pl: "..." }
 * - anything else -> stringify safely (avoid [object Object])
 */
function pickTextValue(value: any, lang: string = "en"): string {
  if (value == null) return "";

  if (typeof value === "string") return value.trim();

  // e.g. { text: { en: "...", pl: "..." } }
  if (typeof value === "object" && value.text && typeof value.text === "object") {
    const v = value.text[lang] ?? value.text.en ?? value.text.pl;
    if (typeof v === "string") return v.trim();
  }

  // e.g. { en: "...", pl: "..." }
  if (typeof value === "object") {
    const v = value[lang] ?? value.en ?? value.pl;
    if (typeof v === "string") return v.trim();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeLang(input: any): string {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!raw) return "en";
  // handle values like "pl-PL"
  return raw.split("-")[0] || "en";
}

export default function Step02_PlantTraits() {
  const { state, actions } = useCreatePlantWizard();
  const { settings } = useSettings();

  // Global language from settings (fallback to English)
  // Supports both `settings.language` or `settings.lang` to be safe.
  const preferredLang = normalizeLang((settings as any)?.language ?? (settings as any)?.lang ?? "en");

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

    // fallback: keep selected plant synced
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

  // Local API wrappers that force backend language via ?lang=
  const fetchSearchIndexWithLang = async (): Promise<Suggestion[]> => {
    const url = `${ENDPOINTS.searchIndex}?lang=${encodeURIComponent(preferredLang)}`;
    const data = await request<ApiPlantSuggestion[]>(url, "GET", undefined, { auth: true });
    return (data ?? []).map(serializePlantSuggestion);
  };

  const fetchProfileWithLang = async (idOrExternalId: string | number): Promise<PlantProfile> => {
    const base = ENDPOINTS.profile(idOrExternalId);
    const url = `${base}?lang=${encodeURIComponent(preferredLang)}`;
    const data = await request<ApiPlantProfile>(url, "GET", undefined, { auth: true });
    return serializePlantProfile(data);
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1) If we have an id already -> fetch directly.
        if (selectedId) {
          const numericId = toNumericIdOrNull(selectedId);
          const p = await fetchProfileWithLang(
            numericId !== null ? numericId : String(selectedId)
          );
          if (!alive) return;

          setProfile(p);
          persistProfile(p);
          return;
        }

        // 2) If we only have a name -> find best match from index, then fetch profile
        if (selectedName) {
          const all: Suggestion[] = await fetchSearchIndexWithLang();
          const q = selectedName.toLowerCase();

          const hit =
            all.find((s) => s.name.toLowerCase() === q) ||
            all.find((s) => s.latin.toLowerCase() === q) ||
            all.find((s) => s.name.toLowerCase().includes(q) || s.latin.toLowerCase().includes(q));

          if (hit?.id) {
            const hitNumeric = toNumericIdOrNull(hit.id);
            const p = await fetchProfileWithLang(hitNumeric !== null ? hitNumeric : String(hit.id));
            if (!alive) return;

            setProfile(p);
            persistProfile(p);
            return;
          }
        }

        // If nothing selected
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
    // language is part of the fetch contract now
  }, [selectedId, selectedName, selected?.latin, preferredLang]);

  const preferences = useMemo(() => {
    const out: Array<{ key: string; label: string; icon: string; value: string }> = [];
    const p: any = profile;

    // 1) Backend traits
    const traits = Array.isArray(p?.traits) ? p.traits : [];
    for (const t of traits) {
      const key = String(t?.key ?? "");
      const value = pickTextValue(t?.value, preferredLang);
      if (!key || !value) continue;

      out.push({
        key,
        label: (TRAIT_LABEL_BY_KEY as any)[key] ?? key,
        icon: (TRAIT_ICON_BY_KEY as any)[key] ?? "leaf",
        value,
      });
    }

    // 2) Core fields (normalize to text)
    if (p?.sun != null) {
      const v = pickTextValue(p.sun, preferredLang);
      if (v) {
        out.push({
          key: "sun",
          label: (TRAIT_LABEL_BY_KEY as any)["sun"] ?? "Sun",
          icon: (TRAIT_ICON_BY_KEY as any)["sun"] ?? "white-balance-sunny",
          value: v,
        });
      }
    }

    if (p?.water != null) {
      const v = pickTextValue(p.water, preferredLang);
      if (v) {
        out.push({
          key: "water",
          label: (TRAIT_LABEL_BY_KEY as any)["water"] ?? "Water",
          icon: (TRAIT_ICON_BY_KEY as any)["water"] ?? "water",
          value: v,
        });
      }
    }

    if (p?.difficulty != null) {
      const v = pickTextValue(p.difficulty, preferredLang);
      if (v) {
        out.push({
          key: "difficulty",
          label: (TRAIT_LABEL_BY_KEY as any)["difficulty"] ?? "Difficulty",
          icon: (TRAIT_ICON_BY_KEY as any)["difficulty"] ?? "arm-flex",
          value: v,
        });
      }
    }

    // 3) Recommended pot/soil mixes
    const pots = Array.isArray(p?.recommended_pot_materials) ? p.recommended_pot_materials : [];
    if (pots.length) {
      const v = pots.map((x: any) => pickTextValue(x, preferredLang)).filter(Boolean);
      if (v.length) {
        out.push({
          key: "recommended_pot_materials",
          label: "Pot materials",
          icon: "cup-outline",
          value: v.join(", "),
        });
      }
    }

    const soils = Array.isArray(p?.recommended_soil_mixes) ? p.recommended_soil_mixes : [];
    if (soils.length) {
      const v = soils.map((x: any) => pickTextValue(x, preferredLang)).filter(Boolean);
      if (v.length) {
        out.push({
          key: "recommended_soil_mixes",
          label: "Soil mixes",
          icon: "shovel",
          value: v.join(", "),
        });
      }
    }

    // 4) Intervals
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
  }, [profile, preferredLang]);

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
