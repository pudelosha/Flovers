// PlantDefinitionModal.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { fetchPlantProfile } from "../../../../api/services/plant-definitions.service";

// ✅ reuse the same trait icon map as Step02 (adjust path if needed)
import { TRAIT_ICON_BY_KEY } from "../../../create-plant/constants/create-plant.constants";

type Props = {
  visible: boolean;
  onClose: () => void;
  plantDefinitionId: number | null;
};

function pickText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();

  if (typeof value === "object" && value.text && typeof value.text === "object") {
    const v = value.text.en ?? value.text.pl ?? value.text.de;
    if (typeof v === "string") return v.trim();
  }

  if (typeof value === "object") {
    const v = value.en ?? value.pl ?? value.de;
    if (typeof v === "string") return v.trim();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

function titleCaseKey(key: string): string {
  const s = (key || "").replace(/[_-]+/g, " ").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PlantDefinitionModal({ visible, onClose, plantDefinitionId }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);

  const tr = React.useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const close = React.useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!visible) return;

      if (!plantDefinitionId || !Number.isFinite(plantDefinitionId)) {
        setProfile(null);
        setLoading(false);
        setError(tr("plantDetailsModals.definition.noId", "No plant definition id found."));
        return;
      }

      setLoading(true);
      setError(null);
      setProfile(null);

      try {
        const p = await fetchPlantProfile(Number(plantDefinitionId), { auth: true });
        if (!cancelled) setProfile(p);
      } catch (e: any) {
        if (!cancelled) {
          setProfile(null);
          setError(
            e?.message || tr("plantDetailsModals.definition.loadFailed", "Failed to load plant definition.")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [visible, plantDefinitionId, tr]);

  // ---- derived values (must be computed regardless of visible) ----
  const name = (profile?.name ? String(profile.name) : "").trim();
  const latin = (profile?.latin ? String(profile.latin) : "").trim();
  const description = pickText(profile?.description);

  const preferences = React.useMemo(() => {
    const out: Array<{ key: string; label: string; icon: string; value: string }> = [];
    const p: any = profile;
    const seen = new Set<string>();

    const traits = Array.isArray(p?.traits) ? p.traits : [];
    for (const trt of traits) {
      const rawKey = String(trt?.key ?? "").trim();
      const key = normalizeTraitKey(rawKey);
      const value = pickText(trt?.value);
      if (!key || !value) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        key,
        label: tr(`createPlant.step02.traits.${key}`, titleCaseKey(key) || key),
        icon: (TRAIT_ICON_BY_KEY as any)[key] ?? "leaf",
        value,
      });
    }

    return out;
  }, [profile, tr]);

  // button + safe area
  const bottomButtonHeight = 52;
  const bottomGap = Math.max(insets.bottom, 0) + 12;
  const scrollPadBottom = bottomButtonHeight + bottomGap + 24;

  // ✅ return null ONLY after hooks have run
  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.glass} pointerEvents="none">
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View pointerEvents="none" style={styles.glassTint} />
          <View pointerEvents="none" style={styles.glassHaze} />
        </View>

        <View style={styles.inner}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scrollPadBottom }}
          >
            <Text style={styles.title} numberOfLines={2}>
              {name || tr("plantDetailsModals.definition.title", "Plant definition")}
            </Text>

            {!!latin && (
              <Text style={styles.latin} numberOfLines={2}>
                {latin}
              </Text>
            )}

            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator />
                <Text style={styles.stateText}>{tr("plantDetailsModals.definition.loading", "Loading...")}</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{tr("plantDetailsModals.definition.error", "Something went wrong.")}</Text>
                <Text style={[styles.stateText, { opacity: 0.9 }]}>{error}</Text>
              </View>
            ) : !profile ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>
                  {tr("plantDetailsModals.definition.empty", "No definition data available.")}
                </Text>
              </View>
            ) : (
              <>
                {!!description && <Text style={styles.desc}>{description}</Text>}

                {!!preferences.length && (
                  <>
                    <Text style={styles.sectionTitle}>
                      {tr("plantDetailsModals.definition.traits", "Traits")}
                    </Text>

                    <View style={styles.prefsGrid}>
                      {preferences.map((row) => (
                        <View key={row.key} style={styles.prefRow}>
                          <MaterialCommunityIcons name={row.icon as any} size={18} color="#FFFFFF" />
                          <Text style={styles.prefLabel}>{row.label}</Text>
                          <Text style={styles.prefValue}>{row.value}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: bottomGap }]}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={close}>
              <Text style={[styles.btnText, styles.btnPrimaryText]}>
                {tr("plantDetailsModals.common.close", "Close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    zIndex: 80,
  },
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 81,
    paddingHorizontal: 24,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  glassHaze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  inner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  latin: {
    marginBottom: 10,
    marginHorizontal: 16,
    color: "rgba(255,255,255,0.90)",
    fontWeight: "700",
    fontStyle: "italic",
  },

  stateBox: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    gap: 10,
  },
  stateText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },

  desc: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "300",
    lineHeight: 18,
    textAlign: "justify",
  },

  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  prefsGrid: { marginHorizontal: 16, marginTop: 4, gap: 8 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prefLabel: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "700", flex: 1 },
  prefValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    zIndex: 999,
    elevation: 999,
    backgroundColor: "transparent",
  },

  btn: {
    alignSelf: "stretch",
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#FFFFFF", fontWeight: "800" },

  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
});
