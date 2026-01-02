import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider"; // Add LanguageProvider import

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { TRAIT_ICON_BY_KEY, TRAIT_LABEL_BY_KEY } from "../constants/create-plant.constants";
import SafeImage from "../../../shared/ui/SafeImage";

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
  return raw.split("-")[0] || "en";
}

function titleCaseKey(key: string): string {
  const s = (key || "").replace(/[_-]+/g, " ").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normalize keys coming from backend traits vs "core fields"
 * so we don't get duplicates like water + watering, temp + temperature, etc.
 */
function normalizeTraitKey(raw: string): string {
  const k = (raw || "").trim().toLowerCase();
  if (!k) return "";

  const map: Record<string, string> = {
    // backend variations -> canonical keys we want to display
    watering: "water",
    temp: "temperature",
    light: "sun",
  };

  return map[k] ?? k;
}

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({ tKey, children, style, variant, values }: { 
  tKey: string, 
  children?: any, 
  style?: any,
  variant?: "title" | "subtitle" | "body",
  values?: any
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  // Use currentLanguage to force re-render when language changes
  React.useMemo(() => {}, [currentLanguage]);
  
  try {
    const text = values ? t(tKey, values) : t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    // Fallback to key if translation fails
    const fallbackText = tKey.split('.').pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
};

export default function Step02_PlantTraits() {
  const { t, i18n } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage(); // Use LanguageProvider
  const { state, actions } = useCreatePlantWizard();
  const { settings } = useSettings();

  // Global language from settings (fallback to English)
  const preferredLang = normalizeLang((settings as any)?.language ?? (settings as any)?.lang ?? "en");

  // Keep i18n in sync with settings language
  useEffect(() => {
    if (preferredLang && i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang).catch(() => {});
    }
  }, [preferredLang, i18n]);

  // Debug: Log when component renders with current language
  useEffect(() => {
    console.log('Step02_PlantTraits rendering with language:', currentLanguage, 'preferredLang:', preferredLang);
  }, [currentLanguage, preferredLang]);

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

  // Safe translation function that uses both hooks
  const getTranslation = useCallback((key: string, fallback?: string, values?: any): string => {
    try {
      // Force dependency on currentLanguage to ensure updates
      const lang = currentLanguage;
      const translation = values ? t(key, values) : t(key);
      return translation || fallback || key.split('.').pop() || key;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return fallback || key.split('.').pop() || key;
    }
  }, [t, currentLanguage]);

  // helper: persist profile in wizard memory if supported
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

  // label resolver: i18n -> constants fallback -> prettified key
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

    // 1) Traits from backend (normalize keys + dedupe)
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

    // helper: add core fields only if not already present in traits
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

    // 2) Core fields (only if not already in traits)
    if (p?.sun != null) addCore("sun", p.sun, "white-balance-sunny");
    if (p?.water != null) addCore("water", p.water, "watering-can-outline");
    if (p?.difficulty != null) addCore("difficulty", p.difficulty, "arm-flex");

    // 3) Recommended pot/soil mixes
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

    // 4) Intervals
    if (p?.water_required && p?.water_interval_days != null) {
      out.push({
        key: "water_interval_days",
        label: getTranslation("createPlant.step02.labels.wateringInterval", "Watering"),
        icon: "watering-can",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", { count: p.water_interval_days }),
      });
    }

    if (p?.moisture_required && p?.moisture_interval_days != null) {
      out.push({
        key: "moisture_interval_days",
        label: getTranslation("createPlant.step02.labels.moistureInterval", "Moisture Check"),
        icon: "water-percent",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", { count: p.moisture_interval_days }),
      });
    }

    if (p?.fertilize_required && p?.fertilize_interval_days != null) {
      out.push({
        key: "fertilize_interval_days",
        label: getTranslation("createPlant.step02.labels.fertilizeInterval", "Fertilizing"),
        icon: "sprout",
        value: getTranslation("createPlant.step02.values.everyDays", "Every {{count}} days", { count: p.fertilize_interval_days }),
      });
    }

    if (p?.repot_required && p?.repot_interval_months != null) {
      out.push({
        key: "repot_interval_months",
        label: getTranslation("createPlant.step02.labels.repotInterval", "Repotting"),
        icon: "flower-pot",
        value: getTranslation("createPlant.step02.values.everyMonths", "Every {{count}} months", { count: p.repot_interval_months }),
      });
    }

    return out;
  }, [profile, preferredLang, getTranslation]);

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
          {selectedName ? `${selectedName}` : getTranslation("createPlant.step02.title", "Plant Traits")}
        </Text>

        {loading && !profile ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginBottom: 10 }]}>{error}</Text>
        ) : null}

        {!!profile && <SafeImage uri={(profile as any)?.image} resizeMode="cover" style={wiz.hero} />}

        {!!(profile as any)?.description && (
          <Text style={wiz.desc}>{(profile as any).description}</Text>
        )}

        {!!profile && (
          <>
            {/* Use TranslatedText component for section title */}
            <TranslatedText 
              tKey="createPlant.step02.preferences" 
              style={wiz.sectionTitle}
            />
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