// components/modals/PlantScannerModal.tsx
import React, { useState } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../../styles/wizard.styles";
import { s as remindersStyles } from "../../../reminders/styles/reminders.styles";
import type { Suggestion } from "../../types/create-plant.types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPlantDetected?: (plant: Suggestion) => void;
};

export default function PlantScannerModal({
  visible,
  onClose,
  onPlantDetected,
}: Props) {
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const handleRecognitionSuccess = (plant: Suggestion) => {
    onPlantDetected?.(plant);
    onClose();
  };

  const handlePickSource = async (source: "camera" | "gallery") => {
    try {
      setError(null);
      setIsUploading(true);

      // TODO:
      // 1. Open camera or gallery depending on `source`
      // 2. Upload selected image to backend
      // 3. Map backend response to Suggestion and call:
      //
      //    handleRecognitionSuccess(recognizedPlant);

    } catch (e: any) {
      setError(e?.message ?? "Failed to recognize the plant. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Backdrop (matches other modals) */}
      <Pressable
        style={remindersStyles.promptBackdrop}
        onPress={() => {
          if (!isUploading) onClose();
        }}
      />

      {/* Centered glass card wrapper */}
      <View style={remindersStyles.promptWrap}>
        <View style={remindersStyles.promptGlass}>
          <BlurView
            // @ts-ignore
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        {/* Sheet – full width; scrollable with capped height */}
        <View
          style={[
            remindersStyles.promptInner,
            { maxHeight: "86%", paddingBottom: insets.bottom || 12 },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={remindersStyles.promptTitle}>Scan plant</Text>
            <Text style={wiz.subtitle}>
              Take a photo or choose one from your gallery. We&apos;ll try to
              recognize the plant and prefill its details.
            </Text>

            {/* Big buttons for camera / gallery */}
            <View style={styles.actionsRow}>
              <Pressable
                disabled={isUploading}
                style={styles.actionCard}
                onPress={() => handlePickSource("camera")}
              >
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={28}
                  color="#FFFFFF"
                />
                <Text style={styles.actionLabel}>Take photo</Text>
              </Pressable>

              <Pressable
                disabled={isUploading}
                style={styles.actionCard}
                onPress={() => handlePickSource("gallery")}
              >
                <MaterialCommunityIcons
                  name="image-multiple-outline"
                  size={28}
                  color="#FFFFFF"
                />
                <Text style={styles.actionLabel}>Choose from gallery</Text>
              </Pressable>
            </View>

            {/* Uploading state */}
            {isUploading && (
              <View style={styles.statusRow}>
                <ActivityIndicator />
                <Text style={styles.statusText}>
                  Uploading and recognizing plant…
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 10 }]}>
                {error}
              </Text>
            )}

            {/* Footer buttons – cancel */}
            <View style={remindersStyles.promptButtonsRow}>
              <Pressable
                style={remindersStyles.promptBtn}
                onPress={() => {
                  if (!isUploading) onClose();
                }}
              >
                <Text style={remindersStyles.promptBtnText}>Close</Text>
              </Pressable>
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
    paddingBottom: 24,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 12,
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
});
