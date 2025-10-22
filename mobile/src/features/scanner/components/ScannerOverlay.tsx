import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
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
          {/* Frosted blur like Login/AuthCard */}
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={20}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="transparent"
          />
          {/* White tint for readability */}
          <View pointerEvents="none" style={styles.overlayTint} />
          {/* Thin border on top */}
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
