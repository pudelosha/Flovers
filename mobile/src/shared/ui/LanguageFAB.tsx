import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/providers/LanguageProvider";

type LangOption = { code: string; label: string; flag: string };

type Props = {
  options?: LangOption[];
  bottomOffset?: number;
  rightOffset?: number;
  position?: "left" | "right";
};

const DEFAULT_OPTIONS: LangOption[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
];

export default function LanguageFAB({
  options,
  bottomOffset = 20,
  rightOffset = 20,
  position = "right",
}: Props) {
  const insets = useSafeAreaInsets();

  // single source of truth for language
  const { currentLanguage, changeLanguage } = useLanguage();

  // i18n (same translation approach as your modals)
  const { t } = useTranslation();
  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [open, setOpen] = useState(false);

  const LANGS = options?.length ? options : DEFAULT_OPTIONS;

  const current = useMemo(() => {
    const found =
      LANGS.find((l) => l.code === currentLanguage) ??
      LANGS.find((l) => l.code === currentLanguage?.split("-")?.[0]);
    return (
      found ?? {
        code: currentLanguage || "en",
        label: currentLanguage || "en",
        flag: "🌐",
      }
    );
  }, [LANGS, currentLanguage]);

  const horizontalStyle =
    position === "left" ? { left: rightOffset } : { right: rightOffset };

  const bottom = Math.max(insets.bottom, 10) + bottomOffset;

  const onPickLanguage = async (lang: string) => {
    try {
      const ok = await changeLanguage(lang);
      if (ok) {
        setOpen(false);
      }
    } catch (e) {
      // keep UI responsive; also helps reveal errors in logs
      console.warn("LanguageFAB: changeLanguage failed", e);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 2000 }]}
      >
        <View
          pointerEvents="box-none"
          style={[s.wrap, horizontalStyle, { bottom, alignItems: "center" }]}
        >
          <Pressable
            onPress={() => setOpen(true)}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
            style={s.mainFab}
            accessibilityRole="button"
            accessibilityLabel={tr("languages.modal.title", "Language")}
          >
            <Text style={s.flagText}>{current.flag}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 2000, elevation: 2000 }]}
    >
      <Pressable
        style={s.promptBackdrop}
        onPress={() => setOpen(false)}
        accessibilityRole="button"
        accessibilityLabel={tr("languages.modal.cancel", "Cancel")}
      />

      <View style={s.promptWrap}>
        {/* IMPORTANT: make glass non-interactive so it never blocks taps */}
        <View pointerEvents="none" style={s.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={
              {
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
              } as any
            }
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {tr("languages.modal.title", "Language")}
          </Text>

          <Text style={s.confirmText}>
            {tr("languages.modal.subtitle", "Select your preferred language")}
          </Text>

          <View style={s.langList}>
            {LANGS.map((opt) => {
              const selected =
                opt.code === current.code ||
                opt.code === currentLanguage ||
                opt.code === currentLanguage?.split("-")?.[0];

              return (
                <Pressable
                  key={opt.code}
                  onPress={() => onPickLanguage(opt.code)}
                  style={[s.langRow, selected && s.langRowSelected]}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  accessibilityRole="button"
                >
                  <Text style={s.langFlag}>{opt.flag}</Text>
                  <Text style={s.langLabel}>
                    {opt.label} <Text style={s.langCode}>({opt.code})</Text>
                  </Text>
                  {selected && <Text style={s.langSelectedMark}>✓</Text>}
                </Pressable>
              );
            })}
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable
              style={s.promptBtn}
              onPress={() => setOpen(false)}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.promptBtnText}>
                {tr("languages.modal.cancel", "Cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute" },

  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,114,133,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },
  flagText: { fontSize: 24, lineHeight: 28 },

  promptBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 20,
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    paddingHorizontal: 24,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  confirmText: {
    color: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    marginBottom: 12,
    fontWeight: "600",
  },

  langList: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 6,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.16)",
  },
  langRowSelected: {
    backgroundColor: "rgba(11,114,133,0.30)",
    borderColor: "rgba(11,114,133,0.75)",
  },
  langFlag: { fontSize: 18, marginRight: 10 },
  langLabel: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  langCode: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  langSelectedMark: {
    marginLeft: "auto",
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },

  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  promptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
});
