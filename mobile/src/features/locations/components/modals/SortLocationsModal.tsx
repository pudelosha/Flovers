import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../app/providers/LanguageProvider';

import { locStyles as s } from '../../styles/locations.styles';

export type SortKey = 'name' | 'count';
export type SortDir = 'asc' | 'desc';

type Props = {
  visible: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onCancel: () => void;
  onApply: (key: SortKey, dir: SortDir) => void;
  onReset?: () => void;
};

export default function SortLocationsModal({
  visible,
  sortKey,
  sortDir,
  onCancel,
  onApply,
  onReset,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split('.').pop() ?? key : txt;
    },
    [t, currentLanguage],
  );

  const [keyOpen, setKeyOpen] = React.useState(false);
  const [dirOpen, setDirOpen] = React.useState(false);
  const [k, setK] = React.useState<SortKey>(sortKey);
  const [d, setD] = React.useState<SortDir>(sortDir);

  React.useEffect(() => {
    if (visible) {
      setK(sortKey);
      setD(sortDir);
      setKeyOpen(false);
      setDirOpen(false);
    }
  }, [visible, sortKey, sortDir]);

  if (!visible) return null;

  return (
    <>
      <AppModalFrame
        visible
        onClose={onCancel}
        closeLabel={tr('locationsModals.common.close', 'Close')}
        scrollable={false}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          style={[
            {
              flex: 1,
            },
            appModalStyles.scroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[appModalStyles.scrollContent, appModalStyles.centeredContent]}
        >
          <Text style={s.promptTitle}>{tr('locationsModals.sort.title', 'Sort locations')}</Text>

          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setDirOpen(false);
                setKeyOpen(o => !o);
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
            >
              <Text style={s.dropdownValue}>
                {k === 'name'
                  ? tr('locationsModals.sort.keyName', 'Location name')
                  : tr('locationsModals.sort.keyCount', 'Plant count')}
              </Text>

              <MaterialCommunityIcons
                name={keyOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {keyOpen && (
              <View style={s.dropdownList}>
                {[
                  {
                    key: 'name',
                    labelKey: 'locationsModals.sort.keyName',
                    fallback: 'Location name',
                  },
                  {
                    key: 'count',
                    labelKey: 'locationsModals.sort.keyCount',
                    fallback: 'Plant count',
                  },
                ].map(opt => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setK(opt.key as SortKey);
                      setKeyOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{tr(opt.labelKey, opt.fallback)}</Text>

                    {k === opt.key && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setKeyOpen(false);
                setDirOpen(o => !o);
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
            >
              <Text style={s.dropdownValue}>
                {d === 'asc'
                  ? tr('locationsModals.sort.dirAsc', 'Ascending')
                  : tr('locationsModals.sort.dirDesc', 'Descending')}
              </Text>

              <MaterialCommunityIcons
                name={dirOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {dirOpen && (
              <View style={s.dropdownList}>
                {[
                  {
                    key: 'asc',
                    labelKey: 'locationsModals.sort.dirAsc',
                    fallback: 'Ascending',
                  },
                  {
                    key: 'desc',
                    labelKey: 'locationsModals.sort.dirDesc',
                    fallback: 'Descending',
                  },
                ].map(opt => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setD(opt.key as SortDir);
                      setDirOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{tr(opt.labelKey, opt.fallback)}</Text>

                    {d === opt.key && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            {onReset ? (
              <Pressable onPress={onReset} style={[s.promptBtn, s.promptDanger]}>
                <Text
                  style={[
                    s.promptBtnText,
                    {
                      color: '#FF6B6B',
                      fontWeight: '800',
                    },
                  ]}
                >
                  {tr('locationsModals.common.reset', 'Reset')}
                </Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>{tr('locationsModals.common.cancel', 'Cancel')}</Text>
            </Pressable>

            <Pressable onPress={() => onApply(k, d)} style={[s.promptBtn, s.promptPrimary]}>
              <Text style={s.promptPrimaryText}>{tr('locationsModals.common.apply', 'Apply')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}
