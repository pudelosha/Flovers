import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';
import LinearGradient from '../../../shared/theme/Gradient';

import { wiz } from '../styles/wizard.styles';
import { useCreatePlantWizard } from '../hooks/useCreatePlantWizard';
import {
  POT_MATERIALS,
  SOIL_MIXES,
  type PotMaterialKey,
  type SoilMixKey,
} from '../constants/create-plant.constants';

// Use your API base (same one you showed)
import { API_BASE } from '../../../config';

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';

export default function Step05_ContainerAndSoil() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();

  const [openWhich, setOpenWhich] = useState<'material' | 'soil' | null>(null);

  // Safe translation (treat key-echo as missing)
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage;
        void _lang;
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (
          (isMissing ? undefined : txt) ||
          fallback ||
          key.split('.').pop() ||
          key
        );
      } catch {
        return fallback || key.split('.').pop() || key;
      }
    },
    [t, currentLanguage],
  );

  const definition = state.selectedPlantDefinition;
  const recommendedPots = new Set(definition?.recommended_pot_materials ?? []);
  const recommendedSoils = new Set(definition?.recommended_soil_mixes ?? []);
  const recommendedLabel = getTranslation(
    'createPlant.step05.recommended',
    'Recommended',
  );

  const materialLabel = useMemo(() => {
    if (!state.potMaterial)
      return getTranslation('createPlant.step05.notSpecified', 'Not specified');
    const f = POT_MATERIALS.find(p => p.key === state.potMaterial);
    if (!f)
      return getTranslation('createPlant.step05.notSpecified', 'Not specified');

    return getTranslation(
      `createPlant.step05.potMaterials.${f.key}.label`,
      (f as any).label || String(f.key),
    );
  }, [state.potMaterial, getTranslation]);

  const soilLabel = useMemo(() => {
    if (!state.soilMix)
      return getTranslation('createPlant.step05.notSpecified', 'Not specified');
    const f = SOIL_MIXES.find(s => s.key === state.soilMix);
    if (!f)
      return getTranslation('createPlant.step05.notSpecified', 'Not specified');

    return getTranslation(
      `createPlant.step05.soilMixes.${f.key}.label`,
      (f as any).label || String(f.key),
    );
  }, [state.soilMix, getTranslation]);

  const toggleMenu = (which: 'material' | 'soil') =>
    setOpenWhich(curr => (curr === which ? null : which));

  const closeMenu = () => setOpenWhich(null);

  // ---------------------------------------------------------------------------
  // Thumbs
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
            'rgba(255, 255, 255, 0.06)',
            'rgba(255, 255, 255, 0.02)',
            'rgba(255, 255, 255, 0.08)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>
          {getTranslation('createPlant.step05.title', 'Container & soil')}
        </Text>
        <Text style={wiz.subtitle}>
          {getTranslation(
            'createPlant.step05.subtitle',
            'These details are optional. Choose the pot/container material and soil or potting mix — or leave them as “Not specified” and continue.',
          )}
        </Text>

        {/* Container material */}
        <Text style={wiz.sectionTitle}>
          {getTranslation(
            'createPlant.step05.containerMaterial',
            'Container material',
          )}
        </Text>
        <Pressable
          style={[wiz.selectField, { borderWidth: 0 }]}
          onPress={() => toggleMenu('material')}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        >
          <Text style={wiz.selectValue}>{materialLabel}</Text>
          <View style={wiz.selectChevronPad}>
            <MaterialCommunityIcons
              name={openWhich === 'material' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Pressable>

        {openWhich === 'material' && (
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 82,
                      height: THUMB_SIZE,
                      borderRadius: THUMB_SIZE / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.10)',
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
                      {getTranslation(
                        'createPlant.step05.notSpecified',
                        'Not specified',
                      )}
                    </Text>
                    <Text style={wiz.dropdownItemDesc}>
                      {getTranslation(
                        'createPlant.step05.notSpecifiedDesc',
                        'Skip this if you’re not sure.',
                      )}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {POT_MATERIALS.map(opt => (
                <Pressable
                  key={opt.key}
                  testID={`material-option-${opt.key}`}
                  style={[
                    wiz.dropdownItem,
                    recommendedPots.has(opt.key) && optionStyles.recommendedRow,
                  ]}
                  onPress={() => {
                    actions.setPotMaterial(opt.key as PotMaterialKey);
                    closeMenu();
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={optionStyles.iconColumn}>
                      <Image
                        source={{ uri: getPotThumbUri(String(opt.key)) }}
                        style={{
                          width: THUMB_SIZE,
                          height: THUMB_SIZE,
                          borderRadius: THUMB_SIZE / 2,
                        }}
                        resizeMode="cover"
                      />
                      {recommendedPots.has(opt.key) && (
                        <Text
                          style={optionStyles.recommendedLabel}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {recommendedLabel}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={wiz.dropdownItemText}>
                        {getTranslation(
                          `createPlant.step05.potMaterials.${opt.key}.label`,
                          (opt as any).label || String(opt.key),
                        )}
                      </Text>
                      <Text
                        style={[
                          wiz.dropdownItemDesc,
                          {
                            fontSize: 13,
                            fontWeight: '300',
                          },
                        ]}
                      >
                        {getTranslation(
                          `createPlant.step05.potMaterials.${opt.key}.description`,
                          (opt as any).description || '',
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
          {getTranslation('createPlant.step05.soilMix', 'Soil / potting mix')}
        </Text>
        <Pressable
          style={[wiz.selectField, { borderWidth: 0 }]}
          onPress={() => toggleMenu('soil')}
          android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
        >
          <Text style={wiz.selectValue}>{soilLabel}</Text>
          <View style={wiz.selectChevronPad}>
            <MaterialCommunityIcons
              name={openWhich === 'soil' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Pressable>

        {openWhich === 'soil' && (
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
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 82,
                      height: THUMB_SIZE,
                      borderRadius: THUMB_SIZE / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.10)',
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
                      {getTranslation(
                        'createPlant.step05.notSpecified',
                        'Not specified',
                      )}
                    </Text>
                    <Text style={wiz.dropdownItemDesc}>
                      {getTranslation(
                        'createPlant.step05.notSpecifiedDesc',
                        'Skip this if you’re not sure.',
                      )}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {SOIL_MIXES.map(opt => (
                <Pressable
                  key={opt.key}
                  testID={`soil-option-${opt.key}`}
                  style={[
                    wiz.dropdownItem,
                    recommendedSoils.has(opt.key) &&
                      optionStyles.recommendedRow,
                  ]}
                  onPress={() => {
                    actions.setSoilMix(opt.key as SoilMixKey);
                    closeMenu();
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={optionStyles.iconColumn}>
                      <Image
                        source={{ uri: getSoilThumbUri(String(opt.key)) }}
                        style={{
                          width: THUMB_SIZE,
                          height: THUMB_SIZE,
                          borderRadius: THUMB_SIZE / 2,
                        }}
                        resizeMode="cover"
                      />
                      {recommendedSoils.has(opt.key) && (
                        <Text
                          style={optionStyles.recommendedLabel}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {recommendedLabel}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={wiz.dropdownItemText}>
                        {getTranslation(
                          `createPlant.step05.soilMixes.${opt.key}.label`,
                          (opt as any).label || String(opt.key),
                        )}
                      </Text>
                      <Text
                        style={[
                          wiz.dropdownItemDesc,
                          {
                            fontSize: 13,
                            fontWeight: '300',
                          },
                        ]}
                      >
                        {getTranslation(
                          `createPlant.step05.soilMixes.${opt.key}.description`,
                          (opt as any).description || '',
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

const optionStyles = StyleSheet.create({
  recommendedRow: { backgroundColor: 'rgba(32,201,151,0.18)' },
  iconColumn: { width: 82, flexShrink: 0, alignItems: 'center', gap: 5 },
  recommendedLabel: {
    color: '#8CE5C1',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
    width: '100%',
  },
});
