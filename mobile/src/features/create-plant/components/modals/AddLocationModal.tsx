import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { wiz } from "../../styles/wizard.styles";
import type { LocationCategory } from "../../types/create-plant.types";
import { PREDEFINED_LOCATIONS } from "../../constants/create-plant.constants";

const TAB_HEIGHT = 16; // matches your AppTabs space reservation

export default function AddLocationModal({
  visible,
  initialName,
  initialCategory = "indoor",
  onClose,
  onCreate,
}: {
  visible: boolean;
  initialName?: string;
  initialCategory?: LocationCategory;
  onClose: () => void;
  onCreate: (name: string, category: LocationCategory) => void;
}) {
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

  const bottomInset = TAB_HEIGHT + insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop that stops at the tab bar (darker, like Profile) */}
        <Pressable
          style={[styles.backdrop, { paddingBottom: bottomInset }]}
          onPress={onClose}
        >
          <View style={{ flex: 1 }} />
        </Pressable>

        {/* Blur/tint layer in the same bounds as backdrop */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { bottom: bottomInset }]}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.35)" },
            ]}
          />
        </View>

        {/* Content above tab bar; full width */}
        <View
          style={[styles.contentWrap, { paddingBottom: bottomInset }]}
          pointerEvents="box-none"
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.contentInner,
              { paddingTop: insets.top + 16 },
            ]}
          >
            <Text style={wiz.promptTitle}>Create location</Text>

            {/* Location name */}
            <TextInput
              style={wiz.inputField}
              placeholder="Location name"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            {/* Category segment (full width) */}
            <View style={wiz.segmentRow}>
              {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => (
                <Pressable
                  key={k}
                  style={[wiz.segBtn, cat === k && wiz.segActive, { flex: 1 }]}
                  onPress={() => setCat(k)}
                >
                  <Text style={wiz.segText}>{k[0].toUpperCase() + k.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            {/* Buttons row 50:50 (above quick suggestions) */}
            <View style={styles.splitButtonsRow}>
              <Pressable style={[styles.splitBtn, styles.splitBtnSecondary]} onPress={onClose}>
                <Text style={styles.splitBtnText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.splitBtn, styles.splitBtnPrimary]} onPress={create}>
                <Text style={[styles.splitBtnText, styles.splitBtnPrimaryText]}>Create location</Text>
              </Pressable>
            </View>

            {/* Quick suggestions – full width sections with 2-column grid chips */}
            <Text style={[wiz.sectionTitle, { marginTop: 14 }]}>Quick suggestions</Text>

            <Text style={wiz.locationCat}>Indoor</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.indoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`ind-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "indoor")}
                >
                  <Text style={wiz.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12 }]}>Outdoor</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.outdoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`out-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "outdoor")}
                >
                  <Text style={wiz.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12 }]}>Other</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.other.slice(0, 9).map((label) => (
                <Pressable
                  key={`oth-${label}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, "other")}
                >
                  <Text style={wiz.chipText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  contentWrap: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: 0,
    top: 0,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // 50:50 buttons row
  splitButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  splitBtn: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splitBtnText: { color: "#FFFFFF", fontWeight: "800" },
  splitBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  splitBtnPrimary: {
    backgroundColor: "rgba(11,114,133,0.9)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  splitBtnPrimaryText: { color: "#FFFFFF" },

  // full-width, 2-column grid for chips
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
});
