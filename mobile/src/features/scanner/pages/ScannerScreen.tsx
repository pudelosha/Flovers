import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Linking, Pressable, Animated, Easing, useWindowDimensions, AnimatedView } from "../../../shared/theme/native";
import { ScrollView } from "../../../shared/ui/HeaderScrollView";
import { useIsFocused, useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { Text } from "../../../shared/theme/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import LinearGradient from "../../../shared/theme/Gradient";
import { useAppTheme } from "../../../shared/theme/ThemeContext";

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";

import { useTranslation } from "react-i18next";


import GlassHeader from "../../../shared/ui/GlassHeader";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../../plants/constants/plants.constants";

import { scannerStyles as styles, SCANNER_CAMERA_OVERLAP } from "../styles/scanner.styles";
import ScannerInstructions from "../components/ScannerInstructions";
import ScannerOverlay from "../components/ScannerOverlay";
import { parseFloversQr, type DeviceQr } from '../../readings/pairing/deviceQr';
import type { PairingMode } from '../../readings/pairing/pairingController';
import PairDeviceModal from '../../readings/components/modals/PairDeviceModal';

// dev/prod aware public URL
import { PUBLIC_BASE_URL_NORM } from "../../../config";

// Same green tones as PlantTile / AuthCard
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function ScannerScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  

  const { height: screenHeight } = useWindowDimensions();
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as { deviceId?: number; deviceOnly?: boolean; action?: PairingMode } | undefined;
  const [deviceQr, setDeviceQr] = useState<DeviceQr | null>(null);
  const [scanError, setScanError] = useState('');
  const processing = useRef(false);
  const closePairing = useCallback(() => { setDeviceQr(null); processing.current = false; setActive(true); }, []);
  const { hasPermission, requestPermission } = useCameraPermission();

  const [active, setActive] = useState(true);
  const [lastScanned, setLastScanned] = useState<string>("");

  // measured heights (below header)
  const [contentHeight, setContentHeight] = useState(screenHeight);
  const [infoHeight, setInfoHeight] = useState(0);

  const device = useCameraDevice("back");

  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
    })();
  }, [hasPermission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setLastScanned("");
      setScanError(''); setDeviceQr(null); processing.current = false;
      setActive(true);
      return () => {
        setLastScanned("");
        setDeviceQr(null); processing.current = false;
        setActive(false);
        navigation.setParams?.({ deviceId: undefined, deviceOnly: false, action: undefined });
      };
    }, [navigation])
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
      if (!value || processing.current || !active || !isFocused) return;
      const parsed = parseFloversQr(value, PUBLIC_BASE_URL_NORM);
      if (parsed.kind === 'device') {
        processing.current = true; setLastScanned(''); setScanError(''); setActive(false); setDeviceQr(parsed.device);
      } else if (parsed.kind === 'plant' && !params?.deviceOnly) {
        processing.current = true; setLastScanned(parsed.token); onValidToken(parsed.token);
      } else {
        setLastScanned('');
        setScanError(t(`readingsModals.pairing.${params?.deviceOnly ? 'deviceQrRequired' : 'invalidQr'}`));
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
  const BOTTOM_SPACER = 130;

  const available =
    contentHeight - infoHeight - TOP_SPACER - BOTTOM_SPACER;

  // min 200, expand if there's more room, cap a bit so it doesn't dominate huge screens
  // The hidden upper strip sits behind the instruction card; keep at least 200dp visible.
  const cameraHeight = Math.max(200, Math.min(available, 320)) + SCANNER_CAMERA_OVERLAP;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t("scanner.header.title", { defaultValue: "Scanner" })}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <AnimatedView
        testID="scanner-layout"
        style={{ flex: 1, opacity, transform: [{ translateY }, { scale }] }}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        <ScrollView testID="scanner-content" style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: TOP_SPACER }} />

        {/* Instruction card */}
        <View
          testID="scanner-instructions-card"
          style={styles.infoWrap}
          onLayout={(e) => setInfoHeight(e.nativeEvent.layout.height)}
        >
          <View style={[styles.infoGlass, { backgroundColor: colors.surface }]}>
            {/* Base green gradient */}
            <LinearGradient
              pointerEvents="none"
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
              locations={[0, 1]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />

            {/* Fog highlight */}
            <LinearGradient
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={[
                "rgba(255, 255, 255, 0.06)",
                "rgba(255, 255, 255, 0.02)",
                "rgba(255, 255, 255, 0.08)",
              ]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View pointerEvents="none" style={styles.frostTint} />
            <View pointerEvents="none" style={styles.frameBorder} />

            <ScannerInstructions />
            {scanError !== '' && <Text style={styles.scanError} accessibilityRole="alert">{scanError}</Text>}
          </View>
        </View>

        {/* Camera frame */}
        <View style={styles.camWrap}>
          <View testID="scanner-camera-frame" style={[styles.camGlass, { height: cameraHeight }]}>
            {/* Base green gradient */}
            <LinearGradient
              pointerEvents="none"
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
              locations={[0, 1]}
              style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
            />

            {/* Fog highlight */}
            <LinearGradient
              pointerEvents="none"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={[
                "rgba(255, 255, 255, 0.06)",
                "rgba(255, 255, 255, 0.02)",
                "rgba(255, 255, 255, 0.08)",
              ]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View pointerEvents="none" style={styles.frostTint} />

            <View style={styles.camInner}>
              {showCamera ? (
                <>
                  <Camera
                    androidPreviewViewType="texture-view"
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
                      <Pressable onPress={() => Linking.openSettings()} style={{ marginTop: 12 }}>
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
        </ScrollView>
      </AnimatedView>
      {deviceQr && isFocused && <PairDeviceModal qr={deviceQr} deviceId={params?.deviceId} mode={params?.action} onClose={closePairing} />}
    </View>
  );
}
