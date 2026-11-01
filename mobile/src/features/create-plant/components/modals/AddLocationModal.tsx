import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Pressable, Text, TextInput, ScrollView, StyleSheet, Keyboard } from 'react-native';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../app/providers/LanguageProvider';

import { wiz } from '../../styles/wizard.styles';
import type { LocationCategory } from '../../types/create-plant.types';
import { PREDEFINED_LOCATIONS } from '../../constants/create-plant.constants';

// Reuse the modal shell from Reminders
import { s as remindersStyles } from '../../../reminders/styles/reminders.styles';

type Props = {
  visible: boolean;
  initialName?: string;
  initialCategory?: LocationCategory;
  onClose: () => void;
  onCreate: (name: string, category: LocationCategory) => void;
};

export default function AddLocationModal({
  visible,
  initialName,
  initialCategory = 'indoor',
  onClose,
  onCreate,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [name, setName] = useState(initialName ?? '');
  const [cat, setCat] = useState<LocationCategory>(initialCategory);
  const scrollRef = useRef<ScrollView>(null);

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;

      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split('.').pop() ?? key : txt;
    },
    [t, currentLanguage],
  );

  useEffect(() => {
    if (visible) {
      setName(initialName ?? '');
      setCat(initialCategory);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
    }
  }, [visible, initialName, initialCategory]);

  const closeModal = () => {
    Keyboard.dismiss();
    onClose();
  };

  const pickSuggestion = (label: string, category: LocationCategory) => {
    setName(label);
    setCat(category);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const create = () => {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed, cat);
  };

  if (!visible) return null;

  return (
    <>
      <AppModalFrame
        visible
        onClose={closeModal}
        closeLabel={tr('createPlant.locationModal.close', 'Close')}
        scrollable={false}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          style={appModalStyles.scroll}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, appModalStyles.scrollContent]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={remindersStyles.promptTitle}>
            {tr('createPlant.locationModal.title', 'New Location')}
          </Text>

          <TextInput
            style={wiz.inputField}
            placeholder={tr('createPlant.locationModal.locationName', 'Location name')}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={name}
            onChangeText={setName}
          />

          <View style={wiz.segmentRow}>
            {(['indoor', 'outdoor', 'other'] as LocationCategory[]).map(k => (
              <Pressable
                key={k}
                style={[
                  wiz.segBtn,
                  cat === k && wiz.segActive,
                  {
                    flex: 1,
                    borderWidth: 0,
                  },
                ]}
                onPress={() => setCat(k)}
              >
                <Text style={wiz.segText}>{tr(`createPlant.step03.categories.${k}`, k)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={remindersStyles.promptButtonsRow}>
            <Pressable style={remindersStyles.promptBtn} onPress={closeModal}>
              <Text style={remindersStyles.promptBtnText}>
                {tr('createPlant.locationModal.cancel', 'Cancel')}
              </Text>
            </Pressable>

            <Pressable
              style={[remindersStyles.promptBtn, remindersStyles.promptPrimary]}
              onPress={() => {
                Keyboard.dismiss();
                create();
              }}
            >
              <Text style={[remindersStyles.promptBtnText, remindersStyles.promptPrimaryText]}>
                {tr('createPlant.locationModal.create', 'Create')}
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              wiz.sectionTitle,
              {
                marginTop: 14,
              },
            ]}
          >
            {tr('createPlant.step03.quickSuggestions', 'Quick suggestions')}
          </Text>

          <Text
            style={[
              wiz.locationCat,
              {
                marginBottom: 6,
              },
            ]}
          >
            {tr('createPlant.step03.categories.indoor', 'Indoor')}
          </Text>

          <View style={styles.gridWrap}>
            {PREDEFINED_LOCATIONS.indoor.slice(0, 9).map(labelKey => {
              const key = `createPlant.locationModal.predefinedLocations.indoor.${labelKey}`;
              const label = tr(key, labelKey);

              return (
                <Pressable
                  key={`ind-${labelKey}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, 'indoor')}
                >
                  <Text
                    style={[
                      wiz.chipText,
                      {
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              wiz.locationCat,
              {
                marginTop: 12,
                marginBottom: 6,
              },
            ]}
          >
            {tr('createPlant.step03.categories.outdoor', 'Outdoor')}
          </Text>

          <View style={styles.gridWrap}>
            {PREDEFINED_LOCATIONS.outdoor.slice(0, 9).map(labelKey => {
              const key = `createPlant.locationModal.predefinedLocations.outdoor.${labelKey}`;
              const label = tr(key, labelKey);

              return (
                <Pressable
                  key={`out-${labelKey}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, 'outdoor')}
                >
                  <Text
                    style={[
                      wiz.chipText,
                      {
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              wiz.locationCat,
              {
                marginTop: 12,
                marginBottom: 6,
              },
            ]}
          >
            {tr('createPlant.step03.categories.other', 'Other')}
          </Text>

          <View style={styles.gridWrap}>
            {PREDEFINED_LOCATIONS.other.slice(0, 9).map(labelKey => {
              const key = `createPlant.locationModal.predefinedLocations.other.${labelKey}`;
              const label = tr(key, labelKey);

              return (
                <Pressable
                  key={`oth-${labelKey}`}
                  style={[wiz.chip, styles.gridChip]}
                  onPress={() => pickSuggestion(label, 'other')}
                >
                  <Text
                    style={[
                      wiz.chipText,
                      {
                        color: '#FFFFFF',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridChip: {
    flexBasis: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
