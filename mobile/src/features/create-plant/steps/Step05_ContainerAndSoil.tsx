// steps/Step05_ContainerAndSoil.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  POT_MATERIALS,
  SOIL_MIXES,
  type PotMaterialKey,
  type SoilMixKey,
} from "../constants/create-plant.constants";

export default function Step05_ContainerAndSoil() {
  const { state, actions } = useCreatePlantWizard();

  const [openWhich, setOpenWhich] = useState<"material" | "soil" | null>(null);

  /**
   * Auto-prefill from plant definition
   * – only if exactly one recommendation exists
   * – never overrides user choice
   */
  useEffect(() => {
    const pd: any = (state as any).selectedPlantDefinition;
    if (!pd) return;

    if (
      !state.potMaterial &&
      Array.isArray(pd.recommended_pot_materials) &&
      pd.recommended_pot_materials.length === 1
    ) {
      actions.setPotMaterial(pd.recommended_pot_materials[0] as PotMaterialKey);
    }

    if (
      !state.soilMix &&
      Array.isArray(pd.recommended_soil_mixes) &&
      pd.recommended_soil_mixes.length === 1
    ) {
      actions.setSoilMix(pd.recommended_soil_mixes[0] as SoilMixKey);
    }
  }, [state, actions]);

  const materialLabel = useMemo(() => {
    if (!state.potMaterial) return "Not specified";
    const f = POT_MATERIALS.find((p) => p.key === state.potMaterial);
    return f?.label ?? "Not specified";
  }, [state.potMaterial]);

  const soilLabel = useMemo(() => {
    if (!state.soilMix) return "Not specified";
    const f = SOIL_MIXES.find((s) => s.key === state.soilMix);
    return f?.label ?? "Not specified";
  }, [state.soilMix]);

  const toggleMenu = (which: "material" | "soil") =>
    setOpenWhich((curr) => (curr === which ? null : which));

  const closeMenu = () => setOpenWhich(null);

  return (
    <View style={wiz.cardWrap}>
      {/* glass frame */}
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
        <Text style={wiz.title}>Container & soil</Text>
        <Text style={wiz.subtitle}>
          These details are optional. Choose the pot/container material and soil or
          potting mix — or leave them as “Not specified” and continue.
        </Text>

        {/* Container material */}
        <Text style={wiz.sectionTitle}>Container material</Text>
        <Pressable
          style={[wiz.selectField, { borderWidth: 0 }]}
          onPress={() => toggleMenu("material")}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        >
          <Text style={wiz.selectValue}>{materialLabel}</Text>
          <View style={wiz.selectChevronPad}>
            <MaterialCommunityIcons
              name={openWhich === "material" ? "chevron-up" : "chevron-down"}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Pressable>

        {openWhich === "material" && (
          <View style={[wiz.dropdownList, { borderWidth: 0 }]}>
            <ScrollView
              style={wiz.dropdownListScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                style={wiz.dropdownItem}
                onPress={() => {
                  actions.setPotMaterial(undefined);
                  closeMenu();
                }}
              >
                <Text style={wiz.dropdownItemText}>Not specified</Text>
                <Text style={wiz.dropdownItemDesc}>
                  Skip this if you’re not sure.
                </Text>
              </Pressable>

              {POT_MATERIALS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={wiz.dropdownItem}
                  onPress={() => {
                    actions.setPotMaterial(opt.key as PotMaterialKey);
                    closeMenu();
                  }}
                >
                  <Text style={wiz.dropdownItemText}>{opt.label}</Text>
                  {!!opt.description && (
                    <Text style={wiz.dropdownItemDesc}>
                      {opt.description}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Soil */}
        <Text style={wiz.sectionTitle}>Soil / potting mix</Text>
        <Pressable
          style={[wiz.selectField, { borderWidth: 0 }]}
          onPress={() => toggleMenu("soil")}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        >
          <Text style={wiz.selectValue}>{soilLabel}</Text>
          <View style={wiz.selectChevronPad}>
            <MaterialCommunityIcons
              name={openWhich === "soil" ? "chevron-up" : "chevron-down"}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Pressable>

        {openWhich === "soil" && (
          <View style={[wiz.dropdownList, { borderWidth: 0 }]}>
            <ScrollView
              style={wiz.dropdownListScroll}
              contentContainerStyle={{ paddingVertical: 4 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                style={wiz.dropdownItem}
                onPress={() => {
                  actions.setSoilMix(undefined);
                  closeMenu();
                }}
              >
                <Text style={wiz.dropdownItemText}>Not specified</Text>
                <Text style={wiz.dropdownItemDesc}>
                  Skip this if you’re not sure.
                </Text>
              </Pressable>

              {SOIL_MIXES.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={wiz.dropdownItem}
                  onPress={() => {
                    actions.setSoilMix(opt.key as SoilMixKey);
                    closeMenu();
                  }}
                >
                  <Text style={wiz.dropdownItemText}>{opt.label}</Text>
                  {!!opt.description && (
                    <Text style={wiz.dropdownItemDesc}>
                      {opt.description}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
