// src/features/locations/pages/LocationsScreen.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import {
  LOCATIONS_HEADER_TITLE,
  LOCATIONS_HEADER_GRADIENT_TINT,
  LOCATIONS_HEADER_SOLID_FALLBACK,
  LOCATIONS_EMPTY_TITLE,
  LOCATIONS_EMPTY_DESCRIPTION,
} from "../constants/locations.constants";

import { locStyles as s } from "../styles/locations.styles";
import LocationTile from "../components/LocationTile";

import type { PlantLocation } from "../types/locations.types";

import {
  fetchPlantInstances,
  type ApiPlantInstanceListItem,
} from "../../../api/services/plant-instances.service";

function norm(v?: string | null) {
  return (v || "").toLowerCase().trim();
}

export default function LocationsScreen() {
  const nav = useNavigation();

  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  const buildLocations = (items: ApiPlantInstanceListItem[]): PlantLocation[] => {
    const map = new Map<string, number>();

    for (const p of items) {
      const name = p.location?.name?.trim() || "Unassigned";
      const key = norm(name) || "unassigned";

      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([key, count]) => ({
        id: key,
        name: key === "unassigned" ? "No location set" : key,
        plantCount: count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchPlantInstances({ auth: true });
      setLocations(buildLocations(data));
    } catch (e: any) {
      showToast(e?.message || "Failed to load locations", "error");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        setLoading(true);
        setLocations([]);

        try {
          await load();
        } finally {
          if (!mounted) return;
        }
      })();

      return () => {
        mounted = false;
      };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Entrance animation
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnim = (id: string) => {
    if (!animMapRef.current.has(id))
      animMapRef.current.set(id, new Animated.Value(0));
    return animMapRef.current.get(id)!;
  };

  useEffect(() => {
    if (loading) return;

    const ids = locations.map((l) => l.id);
    ids.forEach((id) => getAnim(id).setValue(0));

    const seq = ids.map((id, i) =>
      Animated.timing(getAnim(id), {
        toValue: 1,
        duration: 260,
        delay: i * 50,
        useNativeDriver: true,
      })
    );

    Animated.stagger(50, seq).start();
  }, [loading, locations.length]);

  // Empty state animation
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (locations.length === 0) {
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, locations.length]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const handlePressLocation = (loc: PlantLocation) => {
    showToast(`${loc.name}: ${loc.plantCount} plants`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={LOCATIONS_HEADER_TITLE}
          gradientColors={LOCATIONS_HEADER_GRADIENT_TINT}
          solidFallback={LOCATIONS_HEADER_SOLID_FALLBACK}
          showSeparator={false}
        />

        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={LOCATIONS_HEADER_TITLE}
        gradientColors={LOCATIONS_HEADER_GRADIENT_TINT}
        solidFallback={LOCATIONS_HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <Animated.FlatList
        data={locations}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => {
          const v = getAnim(item.id);

          return (
            <Animated.View
              style={{
                opacity: v,
                transform: [
                  {
                    translateY: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
                marginBottom: 12,
              }}
            >
              <LocationTile location={item} onPress={handlePressLocation} />
            </Animated.View>
          );
        }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <Animated.View
            style={{
              opacity: emptyAnim,
              transform: [{ translateY: emptyTranslateY }],
            }}
          >
            <View style={s.emptyGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={20}
              />

              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: "rgba(255,255,255,0.15)" },
                ]}
              />

              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
                ]}
              />

              <View style={s.emptyInner}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={24}
                  color="#FFFFFF"
                  style={{ marginBottom: 10 }}
                />

                <Text style={s.emptyTitle}>{LOCATIONS_EMPTY_TITLE}</Text>
                <Text style={s.emptyText}>{LOCATIONS_EMPTY_DESCRIPTION}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
