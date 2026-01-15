// C:\Projekty\Python\Flovers\mobile\src\features\scanner\components\ScannerOverlay.tsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { scannerStyles as styles } from "../styles/scanner.styles";
import type { ScannerOverlayProps } from "../types/scanner.types";

// Same green tones as PlantTile / AuthCard
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ value, onClear }) => {
  if (!value) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.overlayCenter}>
        <View style={styles.overlayGlass}>
          {/* Base green gradient: light -> dark */}
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

          <View pointerEvents="none" style={styles.overlayTint} />
          <View pointerEvents="none" style={styles.overlayBorder} />

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
