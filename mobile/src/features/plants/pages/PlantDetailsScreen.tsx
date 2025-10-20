// C:\Projekty\Python\Flovers\mobile\src\features\plants\pages\PlantDetailsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Pressable,
} from "react-native";
import { useRoute } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/plants.constants";
import { s } from "../styles/plants.styles";

import {
  fetchPlantInstanceDetail,
  fetchPlantByQr,
  type ApiPlantInstanceListItem,
} from "../../../api/services/plant-instances.service";

// QR tile bits
import QRCode from "react-native-qrcode-svg";
import RNFS from "react-native-fs";
import CameraRoll from "@react-native-camera-roll/camera-roll";

export default function PlantDetailsScreen() {
  const route = useRoute<any>();
  const qrFromNav: string | undefined = route.params?.qrCode;
  const idFromNav: number | undefined = route.params?.plantId ?? route.params?.id;

  const [loading, setLoading] = useState(true);
  const [plant, setPlant] = useState<ApiPlantInstanceListItem | null>(null);
  const [error, setError] = useState<string>("");

  // Fetch once on mount (single call)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (qrFromNav) {
          const p = await fetchPlantByQr(qrFromNav);
          if (!isMounted) return;
          setPlant(p as unknown as ApiPlantInstanceListItem);
        } else if (idFromNav) {
          const p = await fetchPlantInstanceDetail(Number(idFromNav));
          if (!isMounted) return;
          setPlant(p);
        } else {
          throw new Error("No plant id or QR code provided.");
        }
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load plant.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [qrFromNav, idFromNav]);

  const qrCodeValue = useMemo(() => {
    const code = (plant as any)?.qr_code || qrFromNav || "";
    if (!code) return "";
    return `https://flovers.app/api/plant-instances/by-qr/?code=${encodeURIComponent(code)}`;
  }, [plant, qrFromNav]);

  // Save QR code (dataURL -> file -> CameraRoll)
  const onSaveQr = async (svgRef: any) => {
    try {
      if (!svgRef?.toDataURL) throw new Error("QR renderer not ready.");
      const dataUrl: string = await new Promise((res, rej) =>
        svgRef.toDataURL((d: string) => (d ? res(d) : rej(new Error("No dataURL"))))
      );

      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const filePath = `${RNFS.CachesDirectoryPath}/plant_qr_${Date.now()}.png`;
      await RNFS.writeFile(filePath, base64, "base64");

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage permission",
            message: "We need access to save the QR code to your gallery.",
            buttonPositive: "OK",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error("Storage permission denied.");
        }
      }

      await CameraRoll.save(filePath, { type: "photo" });
      Alert.alert("Saved", "QR Code saved to your gallery.");
    } catch (err: any) {
      Alert.alert("Save failed", err?.message ?? String(err));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Plant details"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      {loading ? (
        <View style={[s.wizardPlaceholder, { alignItems: "center" }]}>
          <ActivityIndicator />
          <Text style={[s.wizardText, { marginTop: 8 }]}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={s.wizardPlaceholder}>
          <Text style={s.wizardTitle}>Error</Text>
          <Text style={s.wizardText}>{error}</Text>
        </View>
      ) : !plant ? (
        <View style={s.wizardPlaceholder}>
          <Text style={s.wizardTitle}>Not found</Text>
          <Text style={s.wizardText}>We couldn’t load this plant.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={s.wizardPlaceholder}>
            <Text style={s.wizardTitle}>{plant.display_name || `Plant #${plant.id}`}</Text>
            <Text style={s.wizardText}>
              ID: {plant.id}
              {"\n"}
              Created: {plant.created_at}
            </Text>
          </View>

          {/* QR tile */}
          {!!qrCodeValue && (
            <View style={[s.wizardPlaceholder, { alignItems: "center" }]}>
              <Text style={s.wizardTitle}>QR Code</Text>
              <Text style={[s.wizardText, { marginBottom: 12 }]}>
                Scan to open this plant on your device.
              </Text>

              <QRCode value={qrCodeValue} size={220} getRef={(c) => ((global as any).__qrRef = c)} />

              <Pressable onPress={() => onSaveQr((global as any).__qrRef)} style={{ marginTop: 14 }}>
                <Text style={[s.wizardText, { textDecorationLine: "underline" }]}>
                  Save QR Code
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
