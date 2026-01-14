// C:\Projekty\Python\Flovers\mobile\src\features\create-plant\steps\Step05_ContainerAndSoil.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  POT_MATERIALS,
  SOIL_MIXES,
  type PotMaterialKey,
  type SoilMixKey,
} from "../constants/create-plant.constants";

// Use your API base (same one you showed)
import { API_BASE } from "../../../config";

export default function Step05_ContainerAndSoil() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();

  const [openWhich, setOpenWhich] = useState<"material" | "soil" | null>(null);

  // Safe translation (treat key-echo as missing)
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        // force rerender dependency
        const _lang = currentLanguage;
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

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
    if (!state.potMaterial) return getTranslation("createPlant.step05.notSpecified", "Not specified");
    const f = POT_MATERIALS.find((p) => p.key === state.potMaterial);
    if (!f) return getTranslation("createPlant.step05.notSpecified", "Not specified");

    return getTranslation(
      `createPlant.step05.potMaterials.${f.key}.label`,
      (f as any).label || String(f.key)
    );
  }, [state.potMaterial, getTranslation]);

  const soilLabel = useMemo(() => {
    if (!state.soilMix) return getTranslation("createPlant.step05.notSpecified", "Not specified");
    const f = SOIL_MIXES.find((s) => s.key === state.soilMix);
    if (!f) return getTranslation("createPlant.step05.notSpecified", "Not specified");

    return getTranslation(
      `createPlant.step05.soilMixes.${f.key}.label`,
      (f as any).label || String(f.key)
    );
  }, [state.soilMix, getTranslation]);

  const toggleMenu = (which: "material" | "soil") =>
    setOpenWhich((curr) => (curr === which ? null : which));

  const closeMenu = () => setOpenWhich(null);

  // ---------------------------------------------------------------------------
  // Thumbs
  // Images live under:
  // - backend/media/soil/thumb/<key>.jpg
  // - backend/media/pots/thumb/<key>.jpg
  // Build absolute URLs using API_BASE so <Image/> can load them on device.
  // NOTE: UI rendering only; no other logic is touched.
  // ---------------------------------------------------------------------------
  const THUMB_SIZE = 36;

  const getSoilThumbUri = useCallback((soilKey: string) => {
    return `${API_BASE}/media/soil/thumb/${encodeURIComponent(soilKey)}.jpg`;
  }, []);

  const getPotThumbUri = useCallback((potKey: string) => {
    return `${API_BASE}/media/pots/thumb/${encodeURIComponent(potKey)}.jpg`;
  }, []);

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
        <Text style={wiz.title}>{getTranslation("createPlant.step05.title", "Container & soil")}</Text>
        <Text style={wiz.subtitle}>
          {getTranslation(
            "createPlant.step05.subtitle",
            "These details are optional. Choose the pot/container material and soil or potting mix — or leave them as “Not specified” and continue."
          )}
        </Text>

        {/* Container material */}
        <Text style={wiz.sectionTitle}>
          {getTranslation("createPlant.step05.containerMaterial", "Container material")}
        </Text>
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
                {/* Align with rows that have thumbnails */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      borderRadius: THUMB_SIZE / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="minus-circle-outline"
                      size={20}
                      color="rgba(255,255,255,0.85)"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={wiz.dropdownItemText}>
                      {getTranslation("createPlant.step05.notSpecified", "Not specified")}
                    </Text>
                    <Text style={wiz.dropdownItemDesc}>
                      {getTranslation("createPlant.step05.notSpecifiedDesc", "Skip this if you’re not sure.")}
                    </Text>
                  </View>
                </View>
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
                  {/* Row with left thumb + text */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Image
                      source={{ uri: getPotThumbUri(String(opt.key)) }}
                      style={{
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                        borderRadius: THUMB_SIZE / 2,
                      }}
                      resizeMode="cover"
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={wiz.dropdownItemText}>
                        {getTranslation(
                          `createPlant.step05.potMaterials.${opt.key}.label`,
                          (opt as any).label || String(opt.key)
                        )}
                      </Text>
                      <Text
                        style={[
                          wiz.dropdownItemDesc,
                          {
                            fontSize: 13,
                            fontWeight: "300",
                          },
                        ]}
                      >
                        {getTranslation(
                          `createPlant.step05.potMaterials.${opt.key}.description`,
                          (opt as any).description || ""
                        )}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Soil */}
        <Text style={wiz.sectionTitle}>
          {getTranslation("createPlant.step05.soilMix", "Soil / potting mix")}
        </Text>
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
                {/* Align with rows that have thumbnails */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      borderRadius: THUMB_SIZE / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.10)",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="minus-circle-outline"
                      size={20}
                      color="rgba(255,255,255,0.85)"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={wiz.dropdownItemText}>
                      {getTranslation("createPlant.step05.notSpecified", "Not specified")}
                    </Text>
                    <Text style={wiz.dropdownItemDesc}>
                      {getTranslation("createPlant.step05.notSpecifiedDesc", "Skip this if you’re not sure.")}
                    </Text>
                  </View>
                </View>
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
                  {/* Row with left thumb + text */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Image
                      source={{ uri: getSoilThumbUri(String(opt.key)) }}
                      style={{
                        width: THUMB_SIZE,
                        height: THUMB_SIZE,
                        borderRadius: THUMB_SIZE / 2,
                      }}
                      resizeMode="cover"
                    />

                    <View style={{ flex: 1 }}>
                      <Text style={wiz.dropdownItemText}>
                        {getTranslation(
                          `createPlant.step05.soilMixes.${opt.key}.label`,
                          (opt as any).label || String(opt.key)
                        )}
                      </Text>
                      <Text
                        style={[
                          wiz.dropdownItemDesc,
                          {
                            fontSize: 13,
                            fontWeight: "300",
                          },
                        ]}
                      >
                        {getTranslation(
                          `createPlant.step05.soilMixes.${opt.key}.description`,
                          (opt as any).description || ""
                        )}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
