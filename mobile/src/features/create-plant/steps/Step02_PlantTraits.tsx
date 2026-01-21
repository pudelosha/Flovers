// Step02_PlantTraits.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ActivityIndicator, Text, View, StyleSheet, ImageBackground } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import MaskedView from "@react-native-masked-view/masked-view";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { TRAIT_ICON_BY_KEY, TRAIT_LABEL_BY_KEY } from "../constants/create-plant.constants";

// Read global settings (same provider used in HomeScreen)
import { useSettings } from "../../../app/providers/SettingsProvider";

// Call API with explicit lang param (so we don't depend on device Accept-Language yet)
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

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

function toNumericIdOrNull(id: unknown): number | null {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
  }
  return null;
}

function pickTextValue(value: any, lang: string = "en"): string {
  if (value == null) return "";

  if (typeof value === "string") return value.trim();

  if (typeof value === "object" && value.text && typeof value.text === "object") {
    const v = value.text[lang] ?? value.text.en ?? value.text.pl;
    if (typeof v === "string") return v.trim();
  }

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
  return raw.split("-")[0] || "en";
}

function titleCaseKey(key: string): string {
  const s = (key || "").replace(/[_-]+/g, " ").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalizeTraitKey(raw: string): string {
  const k = (raw || "").trim().toLowerCase();
  if (!k) return "";

  const map: Record<string, string> = {
    watering: "water",
    temp: "temperature",
    light: "sun",
  };

  return map[k] ?? k;
}

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({
  tKey,
  style,
  values,
}: {
  tKey: string;
  style?: any;
  values?: any;
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = values ? t(tKey, values) : t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch {
    const fallbackText = tKey.split(".").pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
};

function ImageMasked({ uri }: { uri: string }) {
  return (
    <ImageBackground
      source={{ uri }}
      resizeMode="cover"
      style={StyleSheet.absoluteFillObject}
    />
  );
}

export default function Step02_PlantTraits() {
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { state, actions } = useCreatePlantWizard();
  const { settings } = useSettings();

  const preferredLang = normalizeLang((settings as any)?.language ?? (settings as any)?.lang ?? "en");

  useEffect(() => {
    if (preferredLang && i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang).catch(() => {});
    }
  }, [preferredLang, i18n]);

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

  const getTranslation = useCallback(
    (key: string, fallback?: string, values?: any): string => {
      try {
        void currentLanguage;
        const translation = values ? t(key, values) : t(key);
        return translation || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  const persistProfile = (p: PlantProfile) => {
    const a: any = actionsRef.current;

    if (typeof a?.setSelectedPlantDefinition === "function") {
      a.setSelectedPlantDefinition(p);
      return;
    }

    if (typeof a?.setSelectedPlant === "function") {
      a.setSelectedPlant({
        ...(selected ?? {}),
        id: (p as any)?.id ?? selected?.id,

        // IMPORTANT: do not overwrite selectedPlant.name (Step01 wants to show latin-display there)
        name: (selected as any)?.name,

        latin: (p as any)?.latin ?? (selected as any)?.latin,
        predefined: (selected as any)?.predefined ?? true,
      });
    }
  };

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
        if (selectedId) {
          const numericId = toNumericIdOrNull(selectedId);
          const p = await fetchProfileWithLang(numericId !== null ? numericId : String(selectedId));
          if (!alive) return;

          setProfile(p);
          persistProfile(p);
          return;
        }

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

        if (!alive) return;
        setProfile(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? getTranslation("createPlant.step02.errorProfile", "Failed to load plant profile"));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [selectedId, selectedName, selected?.latin, preferredLang, getTranslation]);

  const getLabelForKey = (key: string) => {
    const i18nKey = `createPlant.step02.traits.${key}`;
    const localized = getTranslation(i18nKey);
    if (localized && localized !== i18nKey) return localized;

    const constant = (TRAIT_LABEL_BY_KEY as any)[key];
    if (typeof constant === "string" && constant.trim()) return constant.trim();

    return titleCaseKey(key) || key;
  };

  const preferences = useMemo(() => {
    const out: Array<{ key: string; label: string; icon: string; value: string }> = [];
    const p: any = profile;
    const seen = new Set<string>();

    const traits = Array.isArray(p?.traits) ? p.traits : [];
    for (const tr of traits) {
      const rawKey = String(tr?.key ?? "").trim();
      const key = normalizeTraitKey(rawKey);
      const value = pickTextValue(tr?.value, preferredLang);
      if (!key || !value) continue;

      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        key,
        label: getLabelForKey(key),
        icon: (TRAIT_ICON_BY_KEY as any)[key] ?? "leaf",
        value,
      });
    }

    const addCore = (key: string, rawValue: any, fallbackIcon: string) => {
      const value = pickTextValue(rawValue, preferredLang);
      if (!value) return;
      if (seen.has(key)) return;
      seen.add(key);

      out.push({
        key,
        label: getLabelForKey(key),
        icon: (TRAIT_ICON_BY_KEY as any)[key] ?? fallbackIcon,
        value,
      });
    };

    if (p?.sun != null) addCore("sun", p.sun, "white-balance-sunny");
    if (p?.water != null) addCore("water", p.water, "watering-can-outline");
    if (p?.difficulty != null) addCore("difficulty", p.difficulty, "arm-flex");

    const pots = Array.isArray(p?.recommended_pot_materials) ? p.recommended_pot_materials : [];
    if (pots.length) {
      const v = pots.map((x: any) => pickTextValue(x, preferredLang)).filter(Boolean);
      if (v.length) {
        out.push({
          key: "recommended_pot_materials",
          label: getTranslation("createPlant.step02.labels.potMaterials", "Recommended Pot Materials"),
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
          label: getTranslation("createPlant.step02.labels.soilMixes", "Recommended Soil Mixes"),
          icon: "shovel",
          value: v.join(", "),
        });
      }
    }

    if (p?.water_required && p?.water_interval_days != null) {
      out.push({
        key: "water_interval_days",
        label: getTranslation("createPlant.step02.labels.wateringInterval", "Watering"),
        icon: "watering-can",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", {
          count: p.water_interval_days,
        }),
      });
    }

    if (p?.moisture_required && p?.moisture_interval_days != null) {
      out.push({
        key: "moisture_interval_days",
        label: getTranslation("createPlant.step02.labels.moistureInterval", "Moisture Check"),
        icon: "water-percent",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", {
          count: p.moisture_interval_days,
        }),
      });
    }

    if (p?.fertilize_required && p?.fertilize_interval_days != null) {
      out.push({
        key: "fertilize_interval_days",
        label: getTranslation("createPlant.step02.labels.fertilizeInterval", "Fertilizing"),
        icon: "sprout",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", {
          count: p.fertilize_interval_days,
        }),
      });
    }

    if (p?.repot_required && p?.repot_interval_months != null) {
      out.push({
        key: "repot_interval_months",
        label: getTranslation("createPlant.step02.labels.repotInterval", "Repotting"),
        icon: "flower-pot",
        value: getTranslation("createPlant.step02.values.everyMonths", "Every {{count}} months", {
          count: p.repot_interval_months,
        }),
      });
    }

    return out;
  }, [profile, preferredLang, getTranslation]);

  const heroImageUrl = useMemo(() => {
    const p: any = profile;
    return p?.image || p?.image_thumb || null;
  }, [profile]);

  const heroTitle =
    selectedName ||
    (profile as any)?.name ||
    getTranslation("createPlant.step02.title", "Plant Traits");

  return (
    <View style={wiz.cardWrap}>
      {/* glass */}
      <View style={wiz.cardGlass} pointerEvents="none">
        {/* Base green gradient (AuthCard match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (AuthCard match) */}
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
          style={StyleSheet.absoluteFill}
        />

        {/* Keep your existing tint + border (Profile/Wizard consistency) */}
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        {/* HERO IMAGE: flush to top of frame, name inside top-left, bottom alpha-fade */}
        {!!profile && !!heroImageUrl && (
          <View style={heroStyles.heroWrap}>
            <View style={heroStyles.heroImage}>
              <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={
                  <LinearGradient
                    colors={[
                      "rgba(0,0,0,1.00)",
                      "rgba(0,0,0,0.88)",
                      "rgba(0,0,0,0.70)",
                      "rgba(0,0,0,0.42)",
                      "rgba(0,0,0,0.00)",
                    ]}
                    locations={[0, 0.10, 0.55, 0.80, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                }
              >
                <ImageMasked uri={heroImageUrl} />
              </MaskedView>

              {/* small top scrim for readability under the title */}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0.00)"]}
                locations={[0, 1]}
                style={heroStyles.topScrim}
              />

              <View style={heroStyles.heroTitleBox}>
                <Text style={heroStyles.heroTitle} numberOfLines={1}>
                  {heroTitle}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* If no image yet, keep the title as before */}
        {(!profile || !heroImageUrl) && (
          <Text style={[wiz.title, { marginBottom: 6 }]}>
            {selectedName ? `${selectedName}` : getTranslation("createPlant.step02.title", "Plant Traits")}
          </Text>
        )}

        {loading && !profile ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginBottom: 10 }]}>{error}</Text>
        ) : null}

        {!!(profile as any)?.description && (
          <Text style={wiz.desc}>{(profile as any).description}</Text>
        )}

        {!!profile && (
          <>
            <TranslatedText tKey="createPlant.step02.preferences" style={wiz.sectionTitle} />
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

const heroStyles = StyleSheet.create({
  heroWrap: {
    marginLeft: -16,
    marginRight: -16,
    marginTop: -16,
    marginBottom: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: 200,
    justifyContent: "flex-start",
  },
  topScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 70,
  },
  heroTitleBox: {
    position: "absolute",
    left: 16,
    top: 14,
    right: 16,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },
});
