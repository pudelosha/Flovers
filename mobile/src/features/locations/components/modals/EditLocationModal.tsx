import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { locStyles as s } from "../../styles/locations.styles";
import type { LocationCategory } from "../../../create-plant/types/create-plant.types";
import { PREDEFINED_LOCATIONS } from "../../../create-plant/constants/create-plant.constants";

type Props = {
  visible: boolean;
  mode?: "create" | "edit";
  initialName?: string;
  initialCategory?: LocationCategory;
  onCancel: () => void;
  onSave: (name: string, category: LocationCategory) => void;
};

export default function EditLocationModal({
  visible,
  mode = "edit",
  initialName = "",
  initialCategory = "indoor",
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [name, setName] = useState(initialName);
  const [cat, setCat] = useState<LocationCategory>(initialCategory);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setCat(initialCategory);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 0);
    }
  }, [visible, initialName, initialCategory]);

  if (!visible) return null;

  const canSave = !!name.trim();

  const pickSuggestion = (label: string, category: LocationCategory) => {
    setName(label);
    setCat(category);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = () => {
    if (!canSave) return;
    Keyboard.dismiss();
    onSave(name.trim(), cat);
  };

  const categoryLabel = (k: LocationCategory) =>
    tr(
      `locationsModals.edit.categories.${k}`,
      k[0].toUpperCase() + k.slice(1)
    );

  const suggestionLabel = (catKey: LocationCategory, labelKey: string) =>
    tr(`locationsModals.edit.predefinedLocations.${catKey}.${labelKey}`, labelKey);

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
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

        <View style={[s.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.promptTitle}>
              {mode === "create"
                ? tr("locationsModals.edit.titleCreate", "Add location")
                : tr("locationsModals.edit.titleEdit", "Edit location")}
            </Text>

            <Text style={s.inputLabel}>
              {tr("locationsModals.edit.nameLabel", "Location name")}
            </Text>
            <TextInput
              style={s.input}
              placeholder={tr(
                "locationsModals.edit.namePlaceholder",
                "e.g. Living room, Kitchen shelf"
              )}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            <Text style={s.inputLabel}>
              {tr("locationsModals.edit.categoryLabel", "Category")}
            </Text>

            <View style={s.segmentRow}>
              {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => {
                const isActive = cat === k;
                return (
                  <Pressable
                    key={k}
                    style={[s.segBtn, isActive ? s.segActive : s.segInactive]}
                    onPress={() => setCat(k)}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    <Text style={s.segText}>{categoryLabel(k)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.promptButtonsRow}>
              <Pressable
                style={s.promptBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onCancel();
                }}
              >
                <Text style={s.promptBtnText}>
                  {tr("locationsModals.common.cancel", "Cancel")}
                </Text>
              </Pressable>

              <Pressable
                style={[s.promptBtn, s.promptPrimary, !canSave && { opacity: 0.5 }]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={s.promptPrimaryText}>
                  {mode === "create"
                    ? tr("locationsModals.common.create", "Create")
                    : tr("locationsModals.common.save", "Save")}
                </Text>
              </Pressable>
            </View>

            {mode === "create" && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 12 }]}>
                  {tr("locationsModals.edit.quickSuggestions", "Quick suggestions")}
                </Text>

                <Text style={s.locationCat}>{categoryLabel("indoor")}</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.indoor.slice(0, 8).map((labelKey) => {
                    const label = suggestionLabel("indoor", labelKey);
                    return (
                      <Pressable
                        key={`ind-${labelKey}`}
                        style={s.chip}
                        onPress={() => pickSuggestion(label, "indoor")}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={s.chipText}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.locationCat}>{categoryLabel("outdoor")}</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.outdoor.slice(0, 8).map((labelKey) => {
                    const label = suggestionLabel("outdoor", labelKey);
                    return (
                      <Pressable
                        key={`out-${labelKey}`}
                        style={s.chip}
                        onPress={() => pickSuggestion(label, "outdoor")}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={s.chipText}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.locationCat}>{categoryLabel("other")}</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.other.slice(0, 8).map((labelKey) => {
                    const label = suggestionLabel("other", labelKey);
                    return (
                      <Pressable
                        key={`oth-${labelKey}`}
                        style={s.chip}
                        onPress={() => pickSuggestion(label, "other")}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={s.chipText}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}
