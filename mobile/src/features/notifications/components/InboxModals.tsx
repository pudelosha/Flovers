import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from '../../../shared/theme/native';
import { useTranslation } from 'react-i18next';
import AppModalFrame from '../../../shared/ui/AppModalFrame';
import Dropdown from '../../profile/components/Dropdown';
import DateTimePicker from '../../../shared/theme/DateTimePicker';
import type { InboxQuery } from '../../../api/services/inbox.service';
export type InboxModal = 'sort' | 'filter' | 'delete' | null;
const initialDate = (value?: string) =>
  value ? new Date(value + 'T12:00:00') : new Date();
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
export default function InboxModals({
  mode,
  query,
  single,
  busy,
  onClose,
  onApply,
  onDelete,
}: {
  mode: InboxModal;
  query: InboxQuery;
  single: boolean;
  busy: boolean;
  onClose: () => void;
  onApply: (q: InboxQuery) => void;
  onDelete: (scope: 'filtered' | 'all') => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(query);
  const [open, setOpen] = useState<string | null>(null);
  const [picker, setPicker] = useState<'from_date' | 'to_date' | null>(null);
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  useEffect(() => {
    if (mode) {
      setDraft(query);
      setOpen(null);
      setPicker(null);
      setScope('filtered');
    }
  }, [mode, query]);
  const tr = (key: string) => String(t('inbox.' + key));
  const dropdown = (
    key: keyof InboxQuery,
    options: string[],
    label: (v: string) => string,
  ) => (
    <View style={s.field}>
      <Text style={s.label}>
        {tr(key === 'sort' ? 'sort' : key === 'direction' ? 'order' : key)}
      </Text>
      <Dropdown
        open={open === key}
        onToggle={() => setOpen(open === key ? null : key)}
        valueText={label(String(draft[key] || options[0]))}
        items={options.map(value => ({
          key: value || 'all',
          text: label(value),
          selected: (draft[key] || options[0]) === value,
          onPress: () => {
            setDraft({ ...draft, [key]: value || undefined });
            setOpen(null);
          },
        }))}
      />
    </View>
  );
  const invalid =
    !!draft.from_date && !!draft.to_date && draft.from_date > draft.to_date;
  return (
    <AppModalFrame
      visible={!!mode}
      title={tr(
        mode === 'sort'
          ? 'sortTitle'
          : mode === 'filter'
          ? 'filterTitle'
          : 'deleteTitle',
      )}
      onClose={() => {
        if (!busy) onClose();
      }}
      centerContent={mode !== 'filter'}
      loading={busy}
    >
      {mode === 'sort' && (
        <>
          {dropdown('sort', ['date', 'source', 'channel'], v => tr(v))}
          {dropdown('direction', ['desc', 'asc'], v =>
            tr(v === 'desc' ? 'newest' : 'oldest'),
          )}
        </>
      )}
      {mode === 'filter' && (
        <>
          {dropdown('source', ['', 'task', 'pump', 'device', 'user'], v =>
            v ? tr('sources.' + v) : tr('all'),
          )}
          {dropdown('channel', ['', 'email', 'push', 'in_app'], v =>
            v ? tr('channels.' + v) : tr('all'),
          )}
          {(['from_date', 'to_date'] as const).map(key => (
            <View key={key} style={s.field}>
              <Text style={s.label}>
                {tr(key === 'from_date' ? 'from' : 'to')}
              </Text>
              <View style={s.dateRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr(key === 'from_date' ? 'from' : 'to')}
                  style={[s.dateField, { flex: 1 }]}
                  onPress={() => setPicker(key)}
                >
                  <Text style={s.text}>{draft[key] || tr('all')}</Text>
                </Pressable>
                {!!draft[key] && (
                  <Pressable
                    style={s.clear}
                    accessibilityLabel={tr('reset')}
                    onPress={() => setDraft({ ...draft, [key]: undefined })}
                  >
                    <Text style={s.text}>×</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
          {picker && (
            <DateTimePicker
              value={initialDate(draft[picker])}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (selected)
                  setDraft({ ...draft, [picker]: dateKey(selected) });
                setPicker(null);
              }}
            />
          )}
          {invalid && <Text style={s.error}>{tr('invalidDates')}</Text>}
          <Pressable
            style={[s.button, s.reset]}
            onPress={() => {
              setDraft({
                ...draft,
                source: undefined,
                channel: undefined,
                from_date: undefined,
                to_date: undefined,
              });
              setOpen(null);
            }}
          >
            <Text style={s.text}>{tr('reset')}</Text>
          </Pressable>
        </>
      )}
      {mode === 'delete' && (
        <>
          <Text style={s.description}>{tr('deleteDescription')}</Text>
          {!single && (
            <View style={s.field}>
              <Dropdown
                open={open === 'scope'}
                onToggle={() => setOpen(open === 'scope' ? null : 'scope')}
                valueText={tr(scope === 'all' ? 'deleteAll' : 'deleteFiltered')}
                items={(['filtered', 'all'] as const).map(value => ({
                  key: value,
                  text: tr(value === 'all' ? 'deleteAll' : 'deleteFiltered'),
                  selected: scope === value,
                  onPress: () => {
                    setScope(value);
                    setOpen(null);
                  },
                }))}
              />
            </View>
          )}
        </>
      )}
      <View style={s.buttons}>
        <Pressable disabled={busy} style={s.button} onPress={onClose}>
          <Text style={s.text}>{tr('cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={busy || invalid}
          style={[
            s.button,
            mode === 'delete' ? s.danger : s.primary,
            (busy || invalid) && { opacity: 0.5 },
          ]}
          onPress={() => (mode === 'delete' ? onDelete(scope) : onApply(draft))}
        >
          <Text style={s.text}>
            {tr(mode === 'delete' ? 'delete' : 'apply')}
          </Text>
        </Pressable>
      </View>
    </AppModalFrame>
  );
}
const s = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  text: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primary: { backgroundColor: '#0B7285' },
  danger: { backgroundColor: 'rgba(255,107,107,0.22)' },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateField: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  clear: { padding: 14 },
  error: { color: '#FF6B6B' },
  reset: { flex: 0, marginBottom: 8 },
});
