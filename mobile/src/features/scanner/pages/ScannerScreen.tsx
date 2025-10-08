import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useIsFocused } from "@react-navigation/native";
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

export default function ScannerScreen() {
  const isFocused = useIsFocused();

  const { hasPermission, requestPermission, openSettings } = useCameraPermission();
  const [active, setActive] = useState(true);
  const [lastScanned, setLastScanned] = useState<string>("");

  const device = useCameraDevice("back");

  const instructionText = useMemo(
    () =>
      "Point the camera at a QR code you printed and attached to your plant’s pot. " +
      "When detected, we’ll show the URL here so you can confirm it works.",
    []
  );

  // Ask permission at mount if not granted (Android esp.)
  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
    })();
  }, [hasPermission, requestPermission]);

  // VisionCamera QR-only scanner — just display the value
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => {
      const first = codes[0];
      const value = first?.value ?? "";
      if (!value) return;

      // Only update if changed to avoid rapid re-renders
      setLastScanned((prev) => (prev === value ? prev : value));
      // Keep the camera running; we only display the value
      setActive(true);
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

      {/* Instruction card (frosted) */}
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
                flovers.app/plant-details?ABcsgQQwe44ty
              </Text>
            </View>
            <Text style={styles.infoHint}>
              We’ll verify codes on the server when you proceed to details (not in this demo).
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

                {/* Center overlay that shows the last scanned URL/value */}
                {lastScanned ? (
                  <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                    <View style={styles.overlayCenter}>
                      <View style={styles.overlayGlass}>
                        <BlurView
                          style={StyleSheet.absoluteFill}
                          blurType="light"
                          blurAmount={18}
                          reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
                        />
                        <View
                          pointerEvents="none"
                          style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: "rgba(0,0,0,0.25)" },
                          ]}
                        />
                        <View style={styles.overlayInner}>
                          <MaterialCommunityIcons
                            name="qrcode-scan"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginBottom: 8 }}
                          />
                          <Text style={styles.overlayTitle}>Scanned value</Text>
                          <Text style={styles.overlayText} numberOfLines={3}>
                            {lastScanned}
                          </Text>
                          <Pressable
                            onPress={() => setLastScanned("")}
                            style={styles.overlayButton}
                          >
                            <Text style={styles.overlayButtonText}>Clear</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}
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

      {/* Spacer */}
      <View style={{ height: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  infoWrap: { paddingHorizontal: 16, paddingTop: 16 },
  infoGlass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    minHeight: 100,
  },
  infoInner: { padding: 16 },
  infoTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 6 },
  infoText: { color: "rgba(255,255,255,0.95)", fontWeight: "200", lineHeight: 18 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  exampleUrl: { color: "#FFFFFF", fontWeight: "800", flexShrink: 1 },
  infoHint: { color: "rgba(255,255,255,0.9)", fontWeight: "200", marginTop: 8 },

  camWrap: { paddingHorizontal: 16, paddingTop: 16 },
  camGlass: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    minHeight: 320,
  },
  camInner: { flex: 1, overflow: "hidden", borderRadius: 18 },
  qrCamera: { width: "100%", height: "100%" },

  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  placeholderText: { color: "#FFFFFF", fontWeight: "800" },
  placeholderHint: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 6 },

  // Overlay styles
  overlayCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  overlayGlass: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    maxWidth: 520,
    width: "100%",
  },
  overlayInner: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 6,
    fontSize: 14,
  },
  overlayText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  overlayButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  overlayButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
