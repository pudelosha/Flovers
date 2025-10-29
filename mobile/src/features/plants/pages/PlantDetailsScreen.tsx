// C:\Projekty\Python\Flovers\mobile\src\features\plants\pages\PlantDetailsScreen.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  TILE_BLUR,
} from "../constants/plants.constants";
import { s } from "../styles/plants.styles";

import {
  fetchPlantInstanceDetail,
  fetchPlantByQr,
  type ApiPlantInstanceListItem,
  type ApiPlantInstanceDetailFull,
} from "../../../api/services/plant-instances.service";

// QR tile bits
import QRCode from "react-native-qrcode-svg";
import RNFS from "react-native-fs";
import CameraRoll from "@react-native-camera-roll/camera-roll";

/* ---------------- Local helpers / dummy constants ---------------- */
type MetricKey = "temperature" | "humidity" | "light" | "moisture";

const METRIC_UNITS: Record<MetricKey, string> = {
  temperature: "°C",
  humidity: "%",
  light: "lx",
  moisture: "%",
};

const ICON_BG: Record<MetricKey, string> = {
  temperature: "#F7831F", // orange
  humidity: "#10B981",    // teal/green
  light: "#F2C94C",       // yellow
  moisture: "#2EA0FF",    // blue
};

function lastReadText(d?: string | null) {
  if (!d) return "Last read: —";
  const dt = new Date(d);
  return `Last read: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
/* ----------------------------------------------------------------- */

export default function PlantDetailsScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const qrFromNav: string | undefined = route.params?.qrCode;
  const idFromNav: number | undefined = route.params?.plantId ?? route.params?.id;

  const [loading, setLoading] = useState(true);
  const [plant, setPlant] = useState<ApiPlantInstanceDetailFull | null>(null);
  const [error, setError] = useState<string>("");

  // Dummy readings (replace with real API later)
  const [latestRead, setLatestRead] = useState<{
    temperature: number | null;
    humidity: number | null;
    light: number | null;
    moisture: number | null;
    tsISO: string | null;
  }>({
    temperature: 23,
    humidity: 57,
    light: 640,
    moisture: 42,
    tsISO: new Date().toISOString(),
  });

  // Dummy reminders (replace with real API later)
  const [reminders] = useState<
    { id: string; title: string; when: string; icon: string }[]
  >([
    { id: "r1", title: "Watering", when: "in 2 days", icon: "watering-can-outline" },
    { id: "r2", title: "Fertilize", when: "next week", icon: "sprout-outline" },
    { id: "r3", title: "Repot check", when: "in 2 months", icon: "pot-outline" },
  ]);

  // Fetch plant by id or QR
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (qrFromNav) {
          const p = await fetchPlantByQr(qrFromNav);
          if (!isMounted) return;
          setPlant(p as unknown as ApiPlantInstanceDetailFull);
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
    const code = plant?.qr_code || qrFromNav || "";
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

  const goHistory = (metric?: MetricKey) => {
    nav.navigate("ReadingsHistory" as never, {
      metric: metric || "temperature",
      range: "day",
      name: plant?.display_name || plant?.plant_definition?.name || "Plant",
    } as never);
  };

  // ---------- ✨ ENTER/EXIT CONTENT ANIMATION ----------
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const contentScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

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
  // ----------------------------------------------------

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Plant details"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <Animated.View
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
        }}
      >
        {loading ? (
          <View style={[styles.centerBox]}>
            <ActivityIndicator />
            <Text style={[styles.dim, { marginTop: 8 }]}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>Error</Text>
            <Text style={styles.dim}>{error}</Text>
          </View>
        ) : !plant ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>Not found</Text>
            <Text style={styles.dim}>We couldn’t load this plant.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
            {/* ---------- INFO FRAME ---------- */}
            <GlassFrame>
              <Text style={styles.h1}>{plant.display_name || plant.plant_definition?.name || `Plant #${plant.id}`}</Text>
              {!!plant.plant_definition?.latin && <Text style={styles.latin}>{plant.plant_definition.latin}</Text>}
              {!!plant.location?.name && <Text style={styles.sub}>{plant.location.name}</Text>}

              <View style={styles.infoGrid}>
                {[
                  { icon: "calendar", label: "Purchased", value: plant.purchase_date || "—" },
                  { icon: "note-edit-outline", label: "Notes", value: plant.notes || "—" },
                  { icon: "white-balance-sunny", label: "Light", value: plant.light_level || "—" },
                  { icon: "compass-outline", label: "Orientation", value: plant.orientation || "—" },
                  { icon: "tape-measure", label: "Distance", value: (plant.distance_cm ?? "—") + (plant.distance_cm != null ? " cm" : "") },
                  { icon: "pot-outline", label: "Pot / Soil", value: [plant.pot_material, plant.soil_mix].filter(Boolean).join(" • ") || "—" },
                ].map((it, i) => (
                  <View key={i} style={styles.infoRow}>
                    <MaterialCommunityIcons name={it.icon as any} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.infoLabel}>{it.label}:</Text>
                    <Text style={styles.infoValue} numberOfLines={2}>{it.value}</Text>
                  </View>
                ))}
              </View>
            </GlassFrame>

            {/* ---------- READINGS FRAME ---------- */}
            <GlassFrame>
              <View style={styles.rowBetween}>
                <Text style={styles.h2}>Latest readings</Text>
                <Pressable onPress={() => goHistory()} style={styles.linkBtn}>
                  <Text style={styles.linkText}>View full history</Text>
                </Pressable>
              </View>

              {/* 4 metrics: icon in colored circle + value; press → History with metric selected */}
              <View style={styles.metricsRow}>
                <MetricCol
                  color={ICON_BG.temperature}
                  icon="thermometer"
                  label="Temp"
                  value={latestRead.temperature}
                  unit={METRIC_UNITS.temperature}
                  onPress={() => goHistory("temperature")}
                />
                <MetricCol
                  color={ICON_BG.humidity}
                  icon="water-percent"
                  label="Hum"
                  value={latestRead.humidity}
                  unit={METRIC_UNITS.humidity}
                  onPress={() => goHistory("humidity")}
                />
                <MetricCol
                  color={ICON_BG.light}
                  icon="white-balance-sunny"
                  label="Light"
                  value={latestRead.light}
                  unit={METRIC_UNITS.light}
                  onPress={() => goHistory("light")}
                />
                <MetricCol
                  color={ICON_BG.moisture}
                  icon="water"
                  label="Moist"
                  value={latestRead.moisture}
                  unit={METRIC_UNITS.moisture}
                  onPress={() => goHistory("moisture")}
                />
              </View>

              <Text style={styles.lastRead}>{lastReadText(latestRead.tsISO)}</Text>
            </GlassFrame>

            {/* ---------- REMINDERS FRAME ---------- */}
            <GlassFrame>
              <View style={styles.rowBetween}>
                <Text style={styles.h2}>Reminders</Text>
                <Pressable onPress={() => nav.navigate("Reminders" as never)} style={styles.linkBtn}>
                  <Text style={styles.linkText}>View all</Text>
                </Pressable>
              </View>

              {reminders.length === 0 ? (
                <Text style={styles.dim}>No reminders yet.</Text>
              ) : (
                <View style={{ marginTop: 6 }}>
                  {reminders.map((r) => (
                    <View key={r.id} style={styles.remRow}>
                      <View style={styles.remIcon}>
                        <MaterialCommunityIcons name={r.icon as any} size={18} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{r.title}</Text>
                        <Text style={styles.remWhen}>{r.when}</Text>
                      </View>
                      <Pressable onPress={() => { /* open reminder details/edit */ }} hitSlop={8}>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </GlassFrame>

            {/* ---------- QR FRAME (kept from your original) ---------- */}
            {!!qrCodeValue && (
              <GlassFrame center>
                <Text style={styles.h2}>QR Code</Text>
                <Text style={[styles.dim, { marginBottom: 12, textAlign: "center" }]}>
                  Scan to open this plant on your device.
                </Text>

                <QRCode value={qrCodeValue} size={220} getRef={(c) => ((global as any).__qrRef = c)} />

                <Pressable onPress={() => onSaveQr((global as any).__qrRef)} style={{ marginTop: 14 }}>
                  <Text style={styles.linkText}>Save QR Code</Text>
                </Pressable>
              </GlassFrame>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/* -------------------- Small glass wrapper -------------------- */
function GlassFrame({
  children,
  center,
}: { children: React.ReactNode; center?: boolean }) {
  return (
    <View style={styles.frameWrap}>
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>
      <View style={[styles.frameInner, center && { alignItems: "center" }]}>
        {children}
      </View>
    </View>
  );
}

/* -------------------- Metric column -------------------- */
function MetricCol({
  color,
  icon,
  label,
  value,
  unit,
  onPress,
}: {
  color: string;
  icon: string;
  label: string;
  value: number | null;
  unit: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.metricCol} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.metricValue}>
        {value == null ? "—" : `${value}${unit}`}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

/* -------------------- Local styles for this screen -------------------- */
const styles = StyleSheet.create({
  centerBox: { padding: 16, alignItems: "center", justifyContent: "center" },

  frameWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 14,
  },
  frameInner: { padding: 16 },

  h1: { color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginBottom: 6 },
  h2: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 8 },

  latin: { color: "rgba(255,255,255,0.9)", fontStyle: "italic", fontWeight: "600", fontSize: 12, marginBottom: 4 },
  sub: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginBottom: 10 },
  dim: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },

  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: { color: "rgba(255,255,255,0.95)", fontWeight: "600", flex: 1 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  linkText: { color: "#FFFFFF", fontWeight: "800", textDecorationLine: "underline" },

  metricsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 6, gap: 10 },
  metricCol: { flex: 1, alignItems: "center" },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  metricValue: { color: "#FFFFFF", fontWeight: "800", fontSize: 14, marginTop: 6 },
  metricLabel: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 11, marginTop: 2 },

  lastRead: { color: "rgba(255,255,255,0.85)", fontWeight: "600", fontSize: 12, marginTop: 6 },

  remRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  remIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  remTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  remWhen: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12 },
});
