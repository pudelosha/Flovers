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
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { fetchPlantProfile } from "../../../../api/services/plant-definitions.service";

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

  const name = (profile?.name ? String(profile.name) : "").trim();
  const latin = (profile?.latin ? String(profile.latin) : "").trim();
  const description = pickText(profile?.description);
  const traits: any[] = Array.isArray(profile?.traits) ? profile.traits : [];

  if (!visible) return null;

  // Button + safe-area math
  const bottomButtonHeight = 52;
  const bottomGap = Math.max(insets.bottom, 0) + 12; // keep tab bar visible, lift button above it
  const scrollPadBottom = bottomButtonHeight + bottomGap + 24;

  return (
    <>
      {/* ✅ lighter backdrop (was too dark) */}
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Glass background */}
        <View style={styles.glass} pointerEvents="none">
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />

          {/* ✅ lighter tint (was too dark) */}
          <View pointerEvents="none" style={styles.glassTint} />

          {/* ✅ optional white haze to match your Home prompt feel */}
          <View pointerEvents="none" style={styles.glassHaze} />
        </View>

        {/* Card */}
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
                <Text style={styles.stateText}>
                  {tr("plantDetailsModals.definition.error", "Something went wrong.")}
                </Text>
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
                {!!description && (
                  <View style={styles.block}>
                    <Text style={styles.blockTitle}>
                      {tr("plantDetailsModals.definition.description", "Description")}
                    </Text>
                    <Text style={styles.blockText}>{description}</Text>
                  </View>
                )}

                <View style={styles.block}>
                  <Text style={styles.blockTitle}>
                    {tr("plantDetailsModals.definition.traits", "Traits")}
                  </Text>

                  {traits.length === 0 ? (
                    <Text style={styles.blockText}>
                      {tr("plantDetailsModals.definition.noTraits", "No traits provided.")}
                    </Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {traits.map((x, idx) => {
                        const rawKey = String(x?.key ?? "").trim();
                        const val = pickText(x?.value);
                        if (!rawKey && !val) return null;

                        return (
                          <View key={`${rawKey}-${idx}`} style={styles.traitRow}>
                            <Text style={styles.traitKey} numberOfLines={1}>
                              {titleCaseKey(rawKey) || tr("common.unknown", "Unknown")}
                            </Text>
                            <Text style={styles.traitValue}>{val || "—"}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {/* ✅ ensure it’s ALWAYS on top + visible */}
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
  // ✅ lighter (Home-like)
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)", // was 0.60
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

  // ✅ lighter tint (lets blur “shine” more)
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)", // was ~0.35
  },

  // ✅ subtle white haze for jelly feel
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
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  latin: {
    marginTop: -6,
    marginBottom: 6,
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

  block: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  blockTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.4,
    fontSize: 13,
    marginBottom: 8,
  },
  blockText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "500",
    lineHeight: 18,
  },

  traitRow: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  traitKey: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  traitValue: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "500",
    lineHeight: 18,
  },

  // ✅ critical: zIndex/elevation so it doesn’t get covered by ScrollView content
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    paddingHorizontal: 16,
    paddingTop: 10,

    zIndex: 999,
    elevation: 999,

    // ✅ gives the button area a readable base (still glassy)
    backgroundColor: "rgba(0,0,0,0.10)",
  },

  btn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
});
