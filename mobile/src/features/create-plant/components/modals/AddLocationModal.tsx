import React, { useEffect, useState } from "react";
import { View, Pressable, Text, TextInput } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { wiz } from "../../styles/wizard.styles";
import type { LocationCategory } from "../../types/create-plant.types";

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
  const [name, setName] = useState(initialName ?? "");
  const [cat, setCat] = useState<LocationCategory>(initialCategory);

  useEffect(() => {
    setName(initialName ?? "");
    setCat(initialCategory ?? "indoor");
  }, [initialName, initialCategory, visible]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={wiz.backdrop} onPress={onClose} />
      <View style={wiz.promptWrap}>
        <View style={wiz.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any}
          />
        </View>

        <View style={wiz.promptInner}>
          <Text style={wiz.promptTitle}>Create location</Text>

          <TextInput
            style={wiz.inputField}
            placeholder="Location name"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={name}
            onChangeText={setName}
          />

          <View style={wiz.segmentRow}>
            {(["indoor", "outdoor", "other"] as LocationCategory[]).map((k) => (
              <Pressable
                key={k}
                style={[wiz.segBtn, cat === k && wiz.segActive]}
                onPress={() => setCat(k)}
              >
                <Text style={wiz.segText}>{k[0].toUpperCase() + k.slice(1)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={wiz.promptButtonsRow}>
            <Pressable style={wiz.btn} onPress={onClose}>
              <Text style={wiz.btnText}>Close</Text>
            </Pressable>
            <Pressable
              style={[wiz.btn, wiz.btnPrimary]}
              onPress={() => {
                const trimmed = name.trim();
                if (trimmed) onCreate(trimmed, cat);
              }}
            >
              <Text style={wiz.btnText}>Create location</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
