import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import type { LocationCategory } from "../types/create-plant.types";
import AddLocationModal from "../components/modals/AddLocationModal";

export default function Step03_SelectLocation({
  onScrollTop,
}: {
  onScrollTop?: () => void;
}) {
  const { state, actions } = useCreatePlantWizard();
  const [modalOpen, setModalOpen] = useState(false);

  const grouped = useMemo(() => {
    return {
      indoor: state.locations.filter((l) => l.category === "indoor"),
      outdoor: state.locations.filter((l) => l.category === "outdoor"),
      other: state.locations.filter((l) => l.category === "other"),
    };
  }, [state.locations]);

  const openCreate = () => {
    setModalOpen(true);
    onScrollTop?.();
  };

  const onCreate = (name: string, cat: LocationCategory) => {
    actions.addLocation(name, cat);
    setModalOpen(false);
  };

  const onPickExisting = (id: string) => {
    actions.selectLocation(id);
    onScrollTop?.();
  };

  const nextDisabled = !state.selectedLocationId;

  return (
    <View style={wiz.cardWrap}>
      {/* glass */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.12)" } as any}
        />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Choose a location</Text>
        <Text style={wiz.smallMuted}>
          Optional but helpful: locations let you group plants and later sort or filter them.
        </Text>

        <Pressable style={wiz.actionFull} onPress={openCreate}>
          <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color="#FFFFFF" />
          <Text style={wiz.actionText}>Create new location</Text>
        </Pressable>

        {/* Prev / Next under the button */}
        <View style={wiz.buttonRowDual}>
          <Pressable style={wiz.btn} onPress={() => actions.goPrev()}>
            <Text style={wiz.btnText}>Previous</Text>
          </Pressable>
          <Pressable
            style={[wiz.btn, wiz.btnPrimary]}
            onPress={() => actions.goNext()}
            disabled={nextDisabled}
          >
            <Text style={wiz.btnText}>Next</Text>
          </Pressable>
        </View>

        {/* User-defined locations only */}
        <Text style={wiz.sectionTitle}>Your locations</Text>
        {(["indoor","outdoor","other"] as LocationCategory[]).map((cat) => {
          const arr = grouped[cat];
          return (
            <View key={cat} style={{ marginBottom: 8 }}>
              <Text style={wiz.locationCat}>{cat[0].toUpperCase() + cat.slice(1)}</Text>
              {arr.length === 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                  No {cat} locations yet.
                </Text>
              ) : (
                arr.map((l) => (
                  <Pressable key={l.id} style={wiz.locationRow} onPress={() => onPickExisting(l.id)}>
                    <Text style={wiz.locationName}>{l.name}</Text>
                    {state.selectedLocationId === l.id && (
                      <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))
              )}
            </View>
          );
        })}
      </View>

      <AddLocationModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={onCreate}
      />
    </View>
  );
}
