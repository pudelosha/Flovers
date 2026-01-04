// C:\Projekty\Python\Flovers\mobile\src\features\scanner\pages\ScannerScreen.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Text } from "react-native-paper";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import GlassHeader from "../../../shared/ui/GlassHeader";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../../plants/constants/plants.constants";

import { scannerStyles as styles } from "../styles/scanner.styles";
import { SCANNER_INSTRUCTION } from "../constants/scanner.constants";
import ScannerOverlay from "../components/ScannerOverlay";

function extractToken(raw: string): string {
  if (!raw) return "";
  try {
    const maybeUrl = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(maybeUrl);
    const hostOk = url.hostname === "flovers.app" || url.hostname.endsWith(".flovers.app");
    if (hostOk) {
      const token = url.searchParams.get("code") || url.searchParams.get("qr") || "";
      if (token) return token;
    }
  } catch {}
  if (/^[A-Za-z0-9\-_]{8,64}$/.test(raw)) return raw;
  return "";
}

export default function ScannerScreen() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { height: screenHeight } = useWindowDimensions();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { hasPermission, requestPermission, openSettings } = useCameraPermission();

  const [active, setActive] = useState(true);
  const [lastScanned, setLastScanned] = useState<string>("");

  // measured heights (below header)
  const [contentHeight, setContentHeight] = useState(screenHeight);
  const [infoHeight, setInfoHeight] = useState(0);

  const device = useCameraDevice("back");

  // Keep memo stable but also refresh when language changes
  const instructionText = useMemo(() => {
    return t("scanner.instruction", { defaultValue: SCANNER_INSTRUCTION });
  }, [t, currentLanguage]);

  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
    })();
  }, [hasPermission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setLastScanned("");
      setActive(true);
      return () => {
        setLastScanned("");
        setActive(false);
      };
    }, [])
  );

  const onValidToken = useCallback(
    (token: string) => {
      setActive(false);
      navigation.navigate("PlantDetails", { qrCode: token });
    },
    [navigation]
  );

  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value ?? "";
      if (!value) return;

      setLastScanned((prev) => (prev === value ? prev : value));

      const token = extractToken(value);
      if (token) {
        onValidToken(token);
      } else {
        setActive(true);
      }
    },
  });

  const showCamera = hasPermission && !!device;

  // ---------- ENTER/EXIT ANIMATION ----------
  const entry = useRef(new Animated.Value(0)).current;
  const opacity = entry;
  const translateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const scale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  useFocusEffect(
    useCallback(() => {
      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      return () => {
        Animated.timing(entry, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();
      };
    }, [entry])
  );

  // ----- Dynamic camera frame height based on real layout -----
  const TOP_SPACER = 5;
  const CAM_WRAP_PADDING_TOP = 16; // from styles.camWrap
  const BOTTOM_SPACER = 130;

  const available =
    contentHeight - infoHeight - TOP_SPACER - CAM_WRAP_PADDING_TOP - BOTTOM_SPACER;

  // min 200, expand if there's more room, cap a bit so it doesn't dominate huge screens
  const cameraHeight = Math.max(200, Math.min(available, 320));

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t("scanner.header.title", { defaultValue: "Scanner" })}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <Animated.View
        style={{ flex: 1, opacity, transform: [{ translateY }, { scale }] }}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ height: TOP_SPACER }} />

        {/* Instruction card */}
        <View
          style={styles.infoWrap}
          onLayout={(e) => setInfoHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.infoGlass}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={20}
              overlayColor="transparent"
              reducedTransparencyFallbackColor="transparent"
            />
            <View pointerEvents="none" style={styles.frostTint} />
            <View pointerEvents="none" style={styles.frameBorder} />

            <View style={styles.infoInner}>
              <Text style={styles.infoTitle}>
                {t("scanner.howItWorks.title", { defaultValue: "How it works" })}
              </Text>

              <Text style={styles.infoText}>{instructionText}</Text>

              <Text style={[styles.infoHint, { marginTop: 8, color: "#FFFFFF", fontWeight: "300", fontSize: 13, lineHeight: 18, textAlign: "justify" }]}>
                {t("scanner.hint1", {
                  defaultValue:
                    "Each plant has its own QR code. You can save it, print it as a small label, attach it to the pot, and scan it here to open the plant instantly.",
                })}
              </Text>

              <Text style={[styles.infoHint, { marginTop: 8, color: "#FFFFFF", fontWeight: "300", fontSize: 13, lineHeight: 18, textAlign: "justify" }]}>
                {t("scanner.qrAvailableIn", { defaultValue: "QR codes are available in:" })}
                {"\n"}•{" "}
                <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>
                  {t("scanner.qrPath1", {
                    defaultValue: "Plants → tap a plant → Plant Details",
                  })}
                </Text>
                {"\n"}•{" "}
                <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>
                  {t("scanner.qrPath2", {
                    defaultValue: "Plants → tile menu → Show QR code",
                  })}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Camera frame */}
        <View style={styles.camWrap}>
          <View style={[styles.camGlass, { height: cameraHeight }]}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={20}
              overlayColor="transparent"
              reducedTransparencyFallbackColor="transparent"
            />
            <View pointerEvents="none" style={styles.frostTint} />

            <View style={styles.camInner}>
              {showCamera ? (
                <>
                  <Camera
                    style={styles.qrCamera}
                    device={device!}
                    isActive={active && isFocused}
                    codeScanner={codeScanner}
                  />
                  <View style={styles.roundedMask} pointerEvents="none" />
                  <ScannerOverlay value={lastScanned} onClear={() => setLastScanned("")} />
                </>
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons
                    name={Platform.OS === "ios" ? "camera" : "camera-outline"}
                    size={36}
                    color="#FFFFFF"
                    style={{ marginBottom: 10 }}
                  />
                  {!hasPermission ? (
                    <>
                      <Text style={styles.placeholderText}>
                        {t("scanner.permissionRequired", {
                          defaultValue: "Camera permission required",
                        })}
                      </Text>
                      <Text style={styles.placeholderHint}>
                        {t("scanner.permissionHint", {
                          defaultValue:
                            "Enable camera access in system settings to scan QR codes.",
                        })}
                      </Text>
                      <Pressable onPress={openSettings} style={{ marginTop: 12 }}>
                        <Text
                          style={[
                            styles.placeholderHint,
                            { textDecorationLine: "underline" },
                          ]}
                        >
                          {t("scanner.openSettings", { defaultValue: "Open Settings" })}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      {t("scanner.initializingCamera", {
                        defaultValue: "Initializing camera…",
                      })}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ height: BOTTOM_SPACER }} />
      </Animated.View>
    </View>
  );
}
