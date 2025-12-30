import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Keyboard,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { wiz } from "../../styles/wizard.styles";
import type { LocationCategory } from "../../types/create-plant.types";
import { PREDEFINED_LOCATIONS } from "../../constants/create-plant.constants";

// Reuse the modal shell from Reminders
import { s as remindersStyles } from "../../../reminders/styles/reminders.styles";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  initialName?: string;
  initialCategory?: LocationCategory;
  onClose: () => void;
  onCreate: (name: string, category: LocationCategory) => void;
};

export default function AddLocationModal({
  visible,
  initialName,
  initialCategory = "indoor",
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation(); // Translation hook
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName ?? "");
  const [cat, setCat] = useState<LocationCategory>(initialCategory);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName ?? "");
      setCat(initialCategory);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
    }
  }, [visible, initialName, initialCategory]);

  const pickSuggestion = (label: string, category: LocationCategory) => {
    setName(label);
    setCat(category);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const create = () => {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed, cat);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop (matches Reminders/EditReminderModal) */}
      <Pressable
        style={remindersStyles.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      />

      {/* Centered glass card wrapper (matches Reminders / EditPlantModal shell) */}
      <View style={remindersStyles.promptWrap}>
        <View style={remindersStyles.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        {/* Sheet — full width; Scrollable with capped height (like EditPlantModal) */}
        <View style={[remindersStyles.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={remindersStyles.promptTitle}>
              {t('createPlant.step03.createLocation')}
            </Text>

            {/* Name input – reuse wizard’s flat 64px style */}
            <TextInput
              style={wiz.inputField}
              placeholder={t('createPlant.step03.locationName')}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            {/* Category segment */}
            <View style={wiz.segmentRow}>
              {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => (
                <Pressable
                  key={k}
                  style={[wiz.segBtn, cat === k && wiz.segActive, { flex: 1 }]}
                  onPress={() => setCat(k)}
                >
                  <Text style={wiz.segText}>
                    {t(`createPlant.step03.categories.${k}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Buttons row – same layout as Reminders prompt buttons */}
            <View style={remindersStyles.promptButtonsRow}>
              <Pressable
                style={remindersStyles.promptBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={remindersStyles.promptBtnText}>
                  {t('createPlant.step03.cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[remindersStyles.promptBtn, remindersStyles.promptPrimary]}
                onPress={() => {
                  Keyboard.dismiss();
                  create();
                }}
              >
                <Text
                  style={[
                    remindersStyles.promptBtnText,
                    remindersStyles.promptPrimaryText,
                  ]}
                >
                  {t('createPlant.step03.createLocation')}
                </Text>
              </Pressable>
            </View>

            {/* Quick suggestions – same chips grid */}
            <Text style={[wiz.sectionTitle, { marginTop: 14 }]}>
              {t('createPlant.step03.quickSuggestions')}
            </Text>

            <Text style={[wiz.locationCat, { marginBottom: 6 }]}>
              {t('createPlant.step03.categories.indoor')}
            </Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.indoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`ind-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "indoor")}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12, marginBottom: 6 }]}>
              {t('createPlant.step03.categories.outdoor')}
            </Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.outdoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`out-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "outdoor")}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12, marginBottom: 6 }]}>
              {t('createPlant.step03.categories.other')}
            </Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.other.slice(0, 9).map((label) => (
                <Pressable
                  key={`oth-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "other")}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  gridChip: {
    flexBasis: "48%",
    alignItems: "center",
    justifyContent: "center",
  },
    promptBtnText: {
    color: "#FFFFFF", 
    fontWeight: "600", 
    fontSize: 12,
  },
});
