import React, { useMemo } from 'react';
import { View, Pressable, Text, ViewStyle } from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { TextInput } from 'react-native-paper';
import { useAppTheme } from '../../../shared/theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { wiz } from '../styles/wizard.styles';

type Suggestion = { id: string; name: string; latin: string };

type Props = {
  value?: string;
  onChange: (t: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelectSuggestion: (item: Suggestion) => void;
  suggestions: Suggestion[];
  compact?: boolean;
  style?: ViewStyle;
  placeholder?: string;
};

export default function PlantSearchBox({
  value, onChange, showSuggestions, setShowSuggestions,
  onSelectSuggestion, suggestions, style, placeholder,
}: Props) {
  const { t } = useTranslation();
  const { isLight } = useAppTheme();
  const ink = isLight ? '#000000' : '#FFFFFF';
  const safeValue = typeof value === 'string' ? value : '';
  const placeholderText = placeholder || String(t('createPlant.step01.searchPlaceholder', { defaultValue: 'Search plant' }));
  const data = useMemo(() => {
    const query = safeValue.trim().toLowerCase();
    if (!query) return [];
    return (suggestions ?? []).filter(item =>
      (item.name ?? '').toLowerCase().includes(query) ||
      (item.latin ?? '').toLowerCase().replace(/_/g, ' ').includes(query),
    );
  }, [safeValue, suggestions]);

  return (
    <View>
      <View style={[wiz.inputRow, { height: 46, paddingVertical: 0, paddingHorizontal: 12 }, style]}>
        <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />
        <TextInput
          mode="flat"
          value={safeValue}
          onChangeText={text => onChange(typeof text === 'string' ? text : '')}
          onFocus={() => setShowSuggestions(!!safeValue.trim())}
          placeholder={placeholderText}
          accessibilityLabel={placeholderText}
          placeholderTextColor={isLight ? '#000000' : 'rgba(255,255,255,0.6)'}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={{ flex: 1, backgroundColor: 'transparent', height: 46 }}
          contentStyle={{
            height: 46, paddingTop: 0, paddingBottom: 0, paddingLeft: 0,
            textAlign: safeValue ? 'auto' : 'center',
            textAlignVertical: 'center', includeFontPadding: false,
          }}
          selectionColor={ink}
          cursorColor={ink}
          textColor={ink}
          theme={{ colors: { primary: ink, onSurfaceVariant: ink } }}
          onSubmitEditing={() => setShowSuggestions(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!safeValue && (
          <Pressable onPress={() => { onChange(''); setShowSuggestions(false); }} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </View>
      {showSuggestions && data.length > 0 && (
        <View style={[wiz.suggestBox, { top: 46 }]}>
          {data.map(item => (
            <Pressable key={item.id} style={wiz.suggestItem} onPress={() => {
              onSelectSuggestion(item); setShowSuggestions(false);
            }}>
              <Text style={wiz.suggestName}>{item.name}</Text>
              <Text style={wiz.suggestLatin}>{item.latin}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
