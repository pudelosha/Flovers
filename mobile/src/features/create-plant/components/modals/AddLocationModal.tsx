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
        {/* Backdrop that stops at the tab bar */}
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
              { backgroundColor: "rgba(0,0,0,0.6)" },
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

            {/* Location name – flat, rounded, no border */}
            <TextInput
              style={styles.inputFlat}
              placeholder="Location name"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            {/* Category segment (full width) — FLAT, NO BORDER */}
            <View style={wiz.segmentRow}>
              {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setCat(k)}
                  style={({ pressed }) => [
                    // start from segBtn geometry but force flat/glass surface
                    wiz.segBtn,
                    {
                      borderWidth: 0, // remove frame
                      backgroundColor:
                        cat === k ? "rgba(11,114,133,0.9)" : "rgba(255,255,255,0.12)",
                      flex: 1,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={wiz.segText}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Buttons row 50:50 – SAME flat button as steps (no border) */}
            <View style={styles.splitButtonsRow}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  wiz.nextBtnWide,
                  {
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={wiz.nextBtnText}>Close</Text>
              </Pressable>

              <Pressable
                onPress={create}
                style={({ pressed }) => [
                  wiz.nextBtnWide,
                  {
                    flex: 1,
                    backgroundColor: "rgba(11,114,133,0.9)",
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={wiz.nextBtnText}>Create location</Text>
              </Pressable>
            </View>

            {/* Quick suggestions — FLAT chips (no border) */}
            <Text style={[wiz.sectionTitle, { marginTop: 14 }]}>Quick suggestions</Text>

            <Text style={[wiz.locationCat, { marginBottom: 6 }]}>Indoor</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.indoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`ind-${label}`}
                  onPress={() => pickSuggestion(label, "indoor")}
                  style={({ pressed }) => [
                    wiz.chip,
                    styles.gridChip,
                    {
                      borderWidth: 0, // remove frame
                      backgroundColor: "rgba(255,255,255,0.12)",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12, marginBottom: 6 }]}>Outdoor</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.outdoor.slice(0, 9).map((label) => (
                <Pressable
                  key={`out-${label}`}
                  onPress={() => pickSuggestion(label, "outdoor")}
                  style={({ pressed }) => [
                    wiz.chip,
                    styles.gridChip,
                    {
                      borderWidth: 0, // remove frame
                      backgroundColor: "rgba(255,255,255,0.12)",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[wiz.locationCat, { marginTop: 12, marginBottom: 6 }]}>Other</Text>
            <View style={styles.gridWrap}>
              {PREDEFINED_LOCATIONS.other.slice(0, 9).map((label) => (
                <Pressable
                  key={`oth-${label}`}
                  onPress={() => pickSuggestion(label, "other")}
                  style={({ pressed }) => [
                    wiz.chip,
                    styles.gridChip,
                    {
                      borderWidth: 0, // remove frame
                      backgroundColor: "rgba(255,255,255,0.12)",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={[wiz.chipText, { color: "#FFFFFF" }]}>{label}</Text>
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

  /** Flat input (matches Login/SearchBox surface; no border) */
  inputFlat: {
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 10,
  },

  /** 50:50 row using Step 1/2/3 flat buttons */
  splitButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },

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
