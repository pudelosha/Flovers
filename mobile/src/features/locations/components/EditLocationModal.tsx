// src/features/locations/components/EditLocationModal.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";

import { locStyles as s } from "../styles/locations.styles";
import type { LocationCategory } from "../../create-plant/types/create-plant.types";
import { PREDEFINED_LOCATIONS } from "../../create-plant/constants/create-plant.constants";

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
  const [name, setName] = useState(initialName);
  const [cat, setCat] = useState<LocationCategory>(initialCategory);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setCat(initialCategory);
      // When opened, make sure we start at the top
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
    // Bounce to top so user sees the updated name/category and buttons
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = () => {
    if (!canSave) return;
    Keyboard.dismiss();
    onSave(name.trim(), cat);
  };

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

        {/* Sheet — capped height + scroll, like EditPlantModal */}
        <View style={[s.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.promptTitle}>
              {mode === "create" ? "Add location" : "Edit location"}
            </Text>

            {/* Location name */}
            <Text style={s.inputLabel}>Location name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Living room, Kitchen shelf"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            {/* Category segment (Indoor / Outdoor / Other) */}
            <Text style={s.inputLabel}>Category</Text>
            <View style={s.segmentRow}>
              {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => {
                const isActive = cat === k;
                return (
                  <Pressable
                    key={k}
                    style={[
                      s.segBtn,
                      isActive ? s.segActive : s.segInactive,
                    ]}
                    onPress={() => setCat(k)}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    <Text style={s.segText}>
                      {k[0].toUpperCase() + k.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Buttons directly beneath category */}
            <View style={s.promptButtonsRow}>
              <Pressable
                style={s.promptBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onCancel();
                }}
              >
                <Text style={s.promptBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  s.promptBtn,
                  s.promptPrimary,
                  !canSave && { opacity: 0.5 },
                ]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={s.promptPrimaryText}>
                  {mode === "create" ? "Create" : "Save"}
                </Text>
              </Pressable>
            </View>

            {/* Quick suggestions – only in CREATE mode, below the buttons */}
            {mode === "create" && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 12 }]}>
                  Quick suggestions
                </Text>

                <Text style={s.locationCat}>Indoor</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.indoor.slice(0, 8).map((label) => (
                    <Pressable
                      key={`ind-${label}`}
                      style={s.chip}
                      onPress={() => pickSuggestion(label, "indoor")}
                      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                    >
                      <Text style={s.chipText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.locationCat}>Outdoor</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.outdoor.slice(0, 8).map((label) => (
                    <Pressable
                      key={`out-${label}`}
                      style={s.chip}
                      onPress={() => pickSuggestion(label, "outdoor")}
                      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                    >
                      <Text style={s.chipText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={s.locationCat}>Other</Text>
                <View style={s.chipRow}>
                  {PREDEFINED_LOCATIONS.other.slice(0, 8).map((label) => (
                    <Pressable
                      key={`oth-${label}`}
                      style={s.chip}
                      onPress={() => pickSuggestion(label, "other")}
                      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                    >
                      <Text style={s.chipText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}
