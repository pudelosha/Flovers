import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { fetchPlantProfile } from "../../../../api/services/plant-definitions.service";

// Match Profile prompts look
import { prompts as pr } from "../../../profile/styles/profile.styles";

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

      try {
        const p = await fetchPlantProfile(Number(plantDefinitionId), { auth: true });
        if (!cancelled) setProfile(p);
      } catch (e: any) {
        if (!cancelled) {
          setProfile(null);
          setError(
            e?.message ||
              tr("plantDetailsModals.definition.loadFailed", "Failed to load plant definition.")
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

  // Keep state-derived values outside render blocks
  const name = (profile?.name ? String(profile.name) : "").trim();
  const latin = (profile?.latin ? String(profile.latin) : "").trim();
  const description = pickText(profile?.description);
  const traits: any[] = Array.isArray(profile?.traits) ? profile.traits : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={close}
    >
      <View style={styles.fullscreen} pointerEvents="box-none">
        {/* Fullscreen backdrop */}
        <Pressable style={styles.backdrop} onPress={close} />

        {/* Fullscreen content host */}
        <View style={styles.screen} pointerEvents="box-none">
          {/* Host with safe-area padding; sheet fills available height */}
          <View
            style={[
              styles.sheetHost,
              {
                paddingTop: Math.max(insets.top, 12),
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {/* Glass background layer (same as your prompts) */}
            <View style={pr.promptGlass} pointerEvents="none">
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                overlayColor="transparent"
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View pointerEvents="none" style={styles.glassTint} />
            </View>

            {/* Full-height sheet */}
            <View style={[pr.promptInner, styles.fullSheet]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 92 }}
              >
                {/* Header */}
                <Text style={pr.promptTitle} numberOfLines={2}>
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
                    <Text style={styles.stateText}>
                      {tr("plantDetailsModals.definition.loading", "Loading...")}
                    </Text>
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

              {/* Bottom Close button */}
              <View style={styles.bottomBar}>
                <Pressable
                  style={[pr.promptBtn, pr.promptPrimary, { flex: 1, alignItems: "center" }]}
                  onPress={close}
                >
                  <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                    {tr("plantDetailsModals.common.close", "Close")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    ...(Platform.OS === "android" ? { paddingTop: 0 } : null),
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.60)",
  },

  // Absolute fill host for the sheet
  screen: {
    ...StyleSheet.absoluteFillObject,
  },

  // Centered with margins like prompts, but allows full height
  sheetHost: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tint over BlurView for glass
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  // Key fix: flex: 1 so it fills the available vertical space
  fullSheet: {
    width: "100%",
    maxWidth: 520,
    flex: 1,
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

  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
});
