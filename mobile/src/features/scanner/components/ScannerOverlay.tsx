import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { scannerStyles as styles } from "../styles/scanner.styles";
import type { ScannerOverlayProps } from "../types/scanner.types";

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ value, onClear }) => {
  if (!value) return null;

  return (
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
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)" }]}
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
              {value}
            </Text>
            <Pressable onPress={onClear} style={styles.overlayButton}>
              <Text style={styles.overlayButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ScannerOverlay;
