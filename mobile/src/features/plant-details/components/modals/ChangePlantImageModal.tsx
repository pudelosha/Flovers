// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\modals\ChangePlantImageModal.tsx
import React, { useCallback } from "react";
import { Modal, View, Text, Pressable, Keyboard, StyleSheet, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePlantImageModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={close} // Android back button
    >
      {/* Fullscreen root */}
      <View style={styles.fullscreen} pointerEvents="box-none">
        {/* Fullscreen backdrop */}
        <Pressable style={styles.backdrop} onPress={close} />

        {/* Centered sheet */}
        <View style={styles.centerWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            {/* Glass background */}
            <View style={styles.glass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                overlayColor="transparent"
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View pointerEvents="none" style={styles.tint} />
            </View>

            {/* Content */}
            <View style={styles.inner}>
              <View style={styles.headerRow}>
                <MaterialCommunityIcons
                  name="image-edit-outline"
                  size={22}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.title}>
                  {tr("plantDetailsModals.changeImage.title", "Change image")}
                </Text>
              </View>

              <Text style={styles.body}>
                {tr(
                  "plantDetailsModals.changeImage.body",
                  "This is a placeholder modal. Image changing will be implemented later."
                )}
              </Text>

              <View style={styles.buttonsRow}>
                <Pressable
                  onPress={close}
                  style={styles.primaryBtn}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                >
                  <Text style={styles.primaryBtnText}>
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
    // This helps ensure full coverage on Android with translucent status bar
    ...(Platform.OS === "android" ? { paddingTop: 0 } : null),
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.60)",
  },

  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  sheet: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    overflow: "hidden",
  },

  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },

  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  inner: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

  body: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    lineHeight: 20,
  },

  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 14,
  },

  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(11,114,133,0.92)",
  },

  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
