import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";

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
  // try full URL first
  try {
    const maybeUrl = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(maybeUrl);
    const hostOk = url.hostname === "flovers.app" || url.hostname.endsWith(".flovers.app");
    if (hostOk) {
      const token = url.searchParams.get("code") || url.searchParams.get("qr") || "";
      if (token) return token;
    }
  } catch {
    // not a URL — fall through to raw token check
  }
  // allow direct token (URL-safe base64-ish)
  if (/^[A-Za-z0-9\-_]{8,64}$/.test(raw)) return raw;
  return "";
}

export default function ScannerScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();
  const { hasPermission, requestPermission, openSettings } = useCameraPermission();

  const [active, setActive] = useState(true);
  const [lastScanned, setLastScanned] = useState<string>("");

  const device = useCameraDevice("back");
  const instructionText = useMemo(() => SCANNER_INSTRUCTION, []);

  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
    })();
  }, [hasPermission, requestPermission]);

  // 🔁 Reset state every time the screen gains focus, and clean up on blur
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
      // stop camera to avoid double scans
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

      // prevent overlay spam
      setLastScanned((prev) => (prev === value ? prev : value));

      const token = extractToken(value);
      if (token) {
        onValidToken(token);
      } else {
        // keep camera running, show the raw value in overlay
        setActive(true);
      }
    },
  });

  const showCamera = hasPermission && !!device;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Scanner"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <View style={{ height: 5 }} />

      {/* Instruction card */}
      <View style={styles.infoWrap}>
        <View style={styles.infoGlass}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]}
          />
          <View style={styles.infoInner}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>{instructionText}</Text>
            <View style={styles.exampleRow}>
              <MaterialCommunityIcons name="link-variant" size={16} color="#FFFFFF" />
              <Text style={styles.exampleUrl} numberOfLines={1}>
                flovers.app/api/plant-instances/by-qr/?code=ABcsgQQwe44ty
              </Text>
            </View>
            <Text style={styles.infoHint}>
              We only navigate after reading a Flovers QR (or a valid token).
            </Text>
          </View>
        </View>
      </View>

      {/* Camera frame */}
      <View style={styles.camWrap}>
        <View style={styles.camGlass}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.10)" }]}
          />
          <View style={styles.camInner}>
            {showCamera ? (
              <>
                <Camera
                  style={styles.qrCamera}
                  device={device!}
                  isActive={active && isFocused}
                  codeScanner={codeScanner}
                />
                {/* purely visual rounded frame on top (no clipping) */}
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
                    <Text style={styles.placeholderText}>Camera permission required</Text>
                    <Text style={styles.placeholderHint}>
                      Enable camera access in system settings to scan QR codes.
                    </Text>
                    <Pressable onPress={openSettings} style={{ marginTop: 12 }}>
                      <Text style={[styles.placeholderHint, { textDecorationLine: "underline" }]}>
                        Open Settings
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>Initializing camera…</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ height: 18 }} />
    </View>
  );
}
