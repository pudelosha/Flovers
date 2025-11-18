import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import type { LocationCategory } from "../types/create-plant.types";
import { fetchUserLocations, createLocation } from "../../../api/services/locations.service";

export default function Step03_SelectLocation({
  onScrollTop,
  onOpenAddLocation,
  onRegisterCreateHandler,
}: {
  onScrollTop?: () => void;
  onOpenAddLocation: () => void;
  onRegisterCreateHandler: (fn: (name: string, category: LocationCategory) => void) => void;
}) {
  const { state, actions } = useCreatePlantWizard();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keep a ref of the latest locations so we can reliably find the new one after add
  const locationsRef = useRef(state.locations);
  useEffect(() => {
    locationsRef.current = state.locations;
  }, [state.locations]);

  // Ensure nothing is pre-selected when arriving at Step 3
  useEffect(() => {
    actions.selectLocation(""); // clear any previous selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user locations from backend when this page is shown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const remote = await fetchUserLocations({ auth: true });

        // Merge into wizard state without duplicates (case-insensitive by name)
        const existing = new Map(
          state.locations.map((l) => [l.name.trim().toLowerCase(), l])
        );
        remote.forEach((r) => {
          const key = r.name.trim().toLowerCase();
          if (!existing.has(key)) {
            actions.addLocation(r.name, r.category as LocationCategory, String(r.id));
          }
        });

        // Guarantee NONE is selected on initial load
        actions.selectLocation("");
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load locations.");
      } finally {
        mounted && setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    return {
      indoor: state.locations.filter((l) => l.category === "indoor"),
      outdoor: state.locations.filter((l) => l.category === "outdoor"),
      other: state.locations.filter((l) => l.category === "other"),
    };
  }, [state.locations]);

  const openCreate = () => {
    setErrorMsg(null);
    onOpenAddLocation();
    onScrollTop?.();
  };

  // Create on backend first, then mirror into wizard state (avoids duplicates)
  const onCreate = useCallback(
    async (name: string, cat: LocationCategory) => {
      const norm = name.trim().toLowerCase();

      // local duplicate guard (case-insensitive)
      if (state.locations.some((l) => l.name.trim().toLowerCase() === norm)) {
        setErrorMsg("Location with this name already exists.");
        return;
      }

      try {
        setErrorMsg(null);
        const created = await createLocation({ name, category: cat }, { auth: true });

        // Add into wizard state
        actions.addLocation(
          created.name,
          created.category as LocationCategory,
          String(created.id)
        );

        // Robust auto-select
        setTimeout(() => {
          const match = locationsRef.current.find(
            (l) =>
              l.name.trim().toLowerCase() === created.name.trim().toLowerCase() &&
              l.category === created.category
          );
          if (match?.id) {
            actions.selectLocation(String(match.id));
          }
        }, 0);

        onScrollTop?.();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Could not create location.");
      }
    },
    [actions, onScrollTop, state.locations]
  );

  // register create handler with parent (WizardBody)
  useEffect(() => {
    onRegisterCreateHandler(onCreate);
  }, [onRegisterCreateHandler, onCreate]);

  const onPickExisting = (id: string | number) => {
    actions.selectLocation(String(id)); // normalize
    onScrollTop?.();
  };

  return (
    <View style={wiz.cardWrap}>
      {/* glass frame — match Step 1: Blur + white tint + thin border */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Choose a location</Text>
        <Text style={wiz.smallMuted}>
          Optional but helpful: locations let you group plants and later sort or filter them.
        </Text>

        {errorMsg && (
          <Text style={{ color: "#ffdddd", fontWeight: "700", marginBottom: 6 }}>
            {errorMsg}
          </Text>
        )}

        {/* Create new location — flat button (same container as Step 1/2), no border */}
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
          <Text style={wiz.nextBtnText}>Create new location</Text>
        </Pressable>

        {/* User-defined locations */}
        <Text style={[wiz.sectionTitle, { marginBottom: 12, marginTop: 18 }]}>
          Your locations
        </Text>

        {(["indoor", "outdoor", "other"] as LocationCategory[]).map((cat) => {
          const arr = grouped[cat];
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              {/* Category header */}
              <View style={{ marginBottom: 5 }}>
                <Text style={[wiz.locationCat, { fontWeight: "800", fontStyle: "italic" }]}>
                  {cat[0].toUpperCase() + cat.slice(1)}
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
                  {loading ? "Loading…" : `No ${cat} locations yet.`}
                </Text>
              ) : (
                arr.map((l) => {
                  const isSelected = String(state.selectedLocationId) === String(l.id);
                  return (
                    <Pressable
                      key={String(l.id)}
                      onPress={() => onPickExisting(l.id)}
                      style={[
                        wiz.locationRow,
                        {
                          borderBottomWidth: 0,
                          paddingVertical: 6,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          wiz.locationName,
                          { fontWeight: isSelected ? "900" : "500" },
                        ]}
                      >
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
