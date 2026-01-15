import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import type { LocationCategory } from "../types/create-plant.types";
import { fetchUserLocations, createLocation } from "../../../api/services/locations.service";

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({
  tKey,
  children,
  style,
  variant,
  values,
}: {
  tKey: string;
  children?: any;
  style?: any;
  variant?: "title" | "subtitle" | "body";
  values?: any;
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = values ? t(tKey, values) : t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch {
    const fallbackText = tKey.split(".").pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
};

export default function Step03_SelectLocation({
  onScrollTop,
  onOpenAddLocation,
  onRegisterCreateHandler,
}: {
  onScrollTop?: () => void;
  onOpenAddLocation: () => void;
  onRegisterCreateHandler: (fn: (name: string, category: LocationCategory) => void) => void;
}) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { state, actions } = useCreatePlantWizard();

  const locations = (state as any)?.locations ?? [];

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const locationsRef = useRef(locations);
  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  const getTranslation = useCallback(
    (key: string, fallback?: string, values?: any): string => {
      try {
        void currentLanguage;
        const translation = values ? t(key, values) : t(key);
        return translation || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  useEffect(() => {
    actions.selectLocation("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const remote = await fetchUserLocations({ auth: true });

        const existing = new Map(locations.map((l: any) => [l.name.trim().toLowerCase(), l]));

        remote.forEach((r: any) => {
          const key = String(r?.name ?? "").trim().toLowerCase();
          if (!key) return;

          if (!existing.has(key)) {
            actions.addLocation(String(r.name), r.category as LocationCategory, String(r.id));
            existing.set(key, r);
          }
        });

        actions.selectLocation("");
      } catch (e: any) {
        setErrorMsg(
          e?.message ??
            getTranslation("createPlant.step03.errorLoadingLocations", "Failed to load locations")
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    return {
      indoor: locations.filter((l: any) => l.category === "indoor"),
      outdoor: locations.filter((l: any) => l.category === "outdoor"),
      other: locations.filter((l: any) => l.category === "other"),
    };
  }, [locations]);

  const openCreate = () => {
    setErrorMsg(null);
    onOpenAddLocation();
    onScrollTop?.();
  };

  const onCreate = useCallback(
    async (name: string, cat: LocationCategory) => {
      const trimmed = name.trim();
      const norm = trimmed.toLowerCase();

      if (!trimmed) return;

      if (locations.some((l: any) => l.name.trim().toLowerCase() === norm)) {
        setErrorMsg(getTranslation("createPlant.step03.locationExists", "Location already exists"));
        return;
      }

      try {
        setErrorMsg(null);
        const created: any = await createLocation({ name: trimmed, category: cat }, { auth: true });

        actions.addLocation(created.name, created.category as LocationCategory, String(created.id));

        setTimeout(() => {
          const match = locationsRef.current.find(
            (l: any) =>
              l.name.trim().toLowerCase() === String(created.name).trim().toLowerCase() &&
              l.category === created.category
          );
          if (match?.id) actions.selectLocation(String(match.id));
        }, 0);

        onScrollTop?.();
      } catch (e: any) {
        setErrorMsg(
          e?.message ??
            getTranslation("createPlant.step03.errorCreatingLocation", "Failed to create location")
        );
      }
    },
    [actions, onScrollTop, locations, getTranslation]
  );

  useEffect(() => {
    onRegisterCreateHandler(onCreate);
  }, [onRegisterCreateHandler, onCreate]);

  const onPickExisting = (id: string | number) => {
    actions.selectLocation(String(id));
    onScrollTop?.();
  };

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass} pointerEvents="none">
        {/* Base green gradient (AuthCard match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (AuthCard match) */}
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

        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <TranslatedText tKey="createPlant.step03.title" style={wiz.title} />
        <TranslatedText tKey="createPlant.step03.subtitle" style={wiz.smallMuted} />

        {errorMsg && (
          <Text style={{ color: "#ffdddd", fontWeight: "700", marginBottom: 6 }}>
            {errorMsg}
          </Text>
        )}

        <Pressable
          onPress={openCreate}
          disabled={loading}
          style={({ pressed }) => [
            wiz.nextBtnWide,
            {
              alignSelf: "stretch",
              backgroundColor: "rgba(255,255,255,0.12)",
              justifyContent: "center",
              gap: 10,
              opacity: pressed || loading ? 0.92 : 1,
            },
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        >
          <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color="#FFFFFF" />
          <Text style={wiz.nextBtnText}>
            {getTranslation("createPlant.step03.createLocation", "Create new location")}
          </Text>
        </Pressable>

        <Text style={[wiz.sectionTitle, { marginBottom: 12, marginTop: 18 }]}>
          {getTranslation("createPlant.step03.yourLocations", "Your locations")}
        </Text>

        {(["indoor", "outdoor", "other"] as LocationCategory[]).map((cat) => {
          const arr = (grouped as any)[cat] as any[];
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              <View style={{ marginBottom: 5 }}>
                <Text style={[wiz.locationCat, { fontWeight: "800", fontStyle: "italic" }]}>
                  {getTranslation(
                    `createPlant.step03.categories.${cat}`,
                    cat.charAt(0).toUpperCase() + cat.slice(1)
                  )}
                </Text>
                <View
                  style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.18)",
                    marginTop: 4,
                  }}
                />
              </View>

              {arr.length === 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                  {loading
                    ? getTranslation("createPlant.step03.loading", "Loading...")
                    : getTranslation(`createPlant.step03.noLocations.${cat}`, `No ${cat} locations`)}
                </Text>
              ) : (
                arr.map((l: any) => {
                  const isSelected = String((state as any).selectedLocationId) === String(l.id);
                  return (
                    <Pressable
                      key={String(l.id)}
                      onPress={() => onPickExisting(l.id)}
                      style={[wiz.locationRow, { borderBottomWidth: 0, paddingVertical: 6 }]}
                    >
                      <Text style={[wiz.locationName, { fontWeight: isSelected ? "900" : "500" }]}>
                        {l.name}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
