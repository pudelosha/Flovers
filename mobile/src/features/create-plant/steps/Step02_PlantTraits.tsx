// steps/Step02_PlantTraits.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { TRAIT_ICON_BY_KEY, TRAIT_LABEL_BY_KEY } from "../constants/create-plant.constants";
import SafeImage from "../../../shared/ui/SafeImage";

// Global settings (language lives here)
import { useSettings } from "../../../app/providers/SettingsProvider";

// i18n
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";

// API (force lang via ?lang=)
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

function capitalizeFirst(s: string) {
  const v = (s || "").trim();
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * Map backend trait keys -> i18n label keys (Step02 only).
 * If a trait key is not listed here, we fall back to TRAIT_LABEL_BY_KEY.
 */
const I18N_LABEL_KEY_BY_TRAIT_KEY: Record<string, string> = {
  sun: "sun",
  water: "water",
  difficulty: "difficulty",
  soil: "soilMixes", // (you can adjust if you later split soil vs soilMixes)
  temperature: "temperature",
  humidity: "humidity",
  toxic: "toxic",
  growth: "growth",

  // these are not backend "traits", but we also show them as rows:
  recommended_pot_materials: "potMaterials",
  recommended_soil_mixes: "soilMixes",
  water_interval_days: "wateringInterval",
  moisture_interval_days: "moistureInterval",
  fertilize_interval_days: "fertilizeInterval",
  repot_interval_months: "repotInterval",
};

export default function Step02_PlantTraits() {
  const { state, actions } = useCreatePlantWizard();
  const { settings } = useSettings();
  const { t } = useTranslation();

  // read language from settings (support both settings.language and settings.lang)
  const preferredLang = normalizeLang(
    (settings as any)?.language ?? (settings as any)?.lang ?? "en"
  );

  // keep i18n in sync with settings language (UI labels)
  useEffect(() => {
    if (preferredLang && i18n.language !== preferredLang) {
      i18n.changeLanguage(preferredLang);
    }
  }, [preferredLang]);

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
          const p = await fetchProfileWithLang(
            numericId !== null ? numericId : String(selectedId)
          );
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
            const p = await fetchProfileWithLang(
              hitNumeric !== null ? hitNumeric : String(hit.id)
            );
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
        setError(e?.message ?? t("createPlant.step02.errorProfile"));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [selectedId, selectedName, selected?.latin, preferredLang, t]);

  const resolveLabel = (key: string): string => {
    const i18nKey = I18N_LABEL_KEY_BY_TRAIT_KEY[key];
    if (i18nKey) {
      const translated = t(`createPlant.step02.labels.${i18nKey}`);
      // If missing, i18next returns the key string; detect that and fallback.
      if (translated && !translated.includes("createPlant.step02.labels.")) return translated;
    }
    const fallback = (TRAIT_LABEL_BY_KEY as any)[key] ?? key;
    return capitalizeFirst(String(fallback));
  };

  const preferences = useMemo(() => {
    const out: Array<{ key: string; label: string; icon: string; value: string }> = [];
    const p: any = profile;

    // 1) Backend traits
    const traits = Array.isArray(p?.traits) ? p.traits : [];
    for (const tRow of traits) {
      const key = String(tRow?.key ?? "");
      const value = pickTextValue(tRow?.value, preferredLang);
      if (!key || !value) continue;

      out.push({
        key,
        label: resolveLabel(key),
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
          label: resolveLabel("sun"),
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
          label: resolveLabel("water"),
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
          label: resolveLabel("difficulty"),
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
          label: resolveLabel("recommended_pot_materials"),
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
          label: resolveLabel("recommended_soil_mixes"),
          icon: "shovel",
          value: v.join(", "),
        });
      }
    }

    // 4) Intervals
    if (p?.water_required && p?.water_interval_days != null) {
      out.push({
        key: "water_interval_days",
        label: resolveLabel("water_interval_days"),
        icon: "watering-can",
        value: t("createPlant.step02.values.everyDays", { count: p.water_interval_days }),
      });
    }

    if (p?.moisture_required && p?.moisture_interval_days != null) {
      out.push({
        key: "moisture_interval_days",
        label: resolveLabel("moisture_interval_days"),
        icon: "water-percent",
        value: t("createPlant.step02.values.everyDays", { count: p.moisture_interval_days }),
      });
    }

    if (p?.fertilize_required && p?.fertilize_interval_days != null) {
      out.push({
        key: "fertilize_interval_days",
        label: resolveLabel("fertilize_interval_days"),
        icon: "sprout",
        value: t("createPlant.step02.values.everyDays", { count: p.fertilize_interval_days }),
      });
    }

    if (p?.repot_required && p?.repot_interval_months != null) {
      out.push({
        key: "repot_interval_months",
        label: resolveLabel("repot_interval_months"),
        icon: "flower-pot",
        value: t("createPlant.step02.values.everyMonths", { count: p.repot_interval_months }),
      });
    }

    return out;
  }, [profile, preferredLang, t]);

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
          {selectedName ? `${selectedName}` : t("createPlant.step02.title")}
        </Text>

        {loading && !profile ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <Text style={[wiz.subtitle, { color: "#ffdddd", marginBottom: 10 }]}>{error}</Text>
        ) : null}

        {!!profile && (
          <SafeImage uri={(profile as any)?.image} resizeMode="cover" style={wiz.hero} />
        )}

        {!!(profile as any)?.description && (
          <Text style={wiz.desc}>{(profile as any).description}</Text>
        )}

        {!!profile && (
          <>
            {/* FIX: correct translation key */}
            <Text style={wiz.sectionTitle}>{t("createPlant.step02.preferences")}</Text>

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
