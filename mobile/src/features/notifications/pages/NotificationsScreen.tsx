import { useTileEntryAnimations } from '../../../shared/hooks/useTileEntryAnimations';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
  AnimatedView,
} from '../../../shared/theme/native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import GlassHeader from '../../../shared/ui/GlassHeader';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import FAB from '../../../shared/ui/FAB';
import TopSnackbar from '../../../shared/ui/TopSnackbar';
import Icon from '../../../shared/theme/Icon';
import Gradient from '../../../shared/theme/Gradient';
import { useSettings } from '../../../app/providers/SettingsProvider';
import {
  fetchInbox,
  deleteInboxItem,
  deleteInboxBatch,
  type InboxItem,
  type InboxQuery,
} from '../../../api/services/inbox.service';
import InboxModals, { type InboxModal } from '../components/InboxModals';
import NotificationTile from '../components/NotificationTile';
const initial: InboxQuery = {
  sort: 'date',
  direction: 'desc',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
};
export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  const active = useRef(focused);
  active.current = focused;
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [query, setQuery] = useState<InboxQuery>(initial);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<InboxModal>(null);
  const [single, setSingle] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    variant: 'success' as 'success' | 'error',
  });
  const request = useRef(0);
  const moreBusy = useRef(false);
  const list = useRef<FlatList<InboxItem>>(null);
  const { styleFor } = useTileEntryAnimations(
    items.length ? items.map(item => item.id) : ['empty'],
    !loading,
    focused,
  );
  const load = useCallback(
    async (refresh = false) => {
      const generation = ++request.current;
      moreBusy.current = false;
      setLoadingMore(false);
      setMoreError(false);
      setMenu(null);
      if (refresh) setRefreshing(true);
      else {
        setLoading(true);
        setItems([]);
      }
      setError(false);
      try {
        const page = await fetchInbox(query);
        if (generation !== request.current || !active.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setSnapshot(page.snapshot);
      } catch {
        if (generation === request.current && active.current) {
          setError(true);
          setSnapshot('');
          setCursor(null);
        }
      } finally {
        if (generation === request.current && active.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [query],
  );
  useEffect(() => {
    if (!focused) {
      setModal(null);
      setSingle(null);
      setMenu(null);
      return;
    }
    void load();
    return () => {
      request.current++;
    };
  }, [focused, load]);
  const more = async () => {
    if (moreBusy.current || loading || !cursor || !active.current) return;
    const generation = request.current;
    moreBusy.current = true;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await fetchInbox(query, cursor);
      if (generation !== request.current || !active.current) return;
      setItems(current => {
        const seen = new Set(current.map(x => x.id));
        return [...current, ...page.items.filter(x => !seen.has(x.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      if (generation === request.current && active.current) setMoreError(true);
    } finally {
      if (generation === request.current && active.current) {
        moreBusy.current = false;
        setLoadingMore(false);
      }
    }
  };
  const remove = async (scope: 'filtered' | 'all') => {
    if (deleting) return;
    const generation = request.current;
    setDeleting(true);
    try {
      if (single) await deleteInboxItem(single);
      else await deleteInboxBatch(snapshot, scope, query);
      if (!active.current || generation !== request.current) return;
      setModal(null);
      setSingle(null);
      setToast({
        visible: true,
        message: String(t('inbox.deleted')),
        variant: 'success',
      });
      await load();
    } catch {
      if (active.current && generation === request.current)
        setToast({
          visible: true,
          message: String(t('inbox.deleteFailed')),
          variant: 'error',
        });
    } finally {
      setDeleting(false);
    }
  };
  const hasFilters = !!(
    query.source ||
    query.channel ||
    query.from_date ||
    query.to_date
  );
  const actions = [
    {
      key: 'sort',
      icon: 'sort',
      label: String(t('inbox.sort')),
      onPress: () => {
        setMenu(null);
        setModal('sort');
      },
    },
    {
      key: 'filter',
      icon: 'filter-variant',
      label: String(t('inbox.filter')),
      onPress: () => {
        setMenu(null);
        setModal('filter');
      },
    },
    ...(hasFilters
      ? [
          {
            key: 'clear',
            icon: 'filter-remove',
            label: String(t('inbox.clearFilters')),
            onPress: () =>
              setQuery({
                ...initial,
                sort: query.sort,
                direction: query.direction,
              }),
          },
        ]
      : []),
    ...(snapshot && !error
      ? [
          {
            key: 'delete',
            icon: 'trash-can-outline',
            label: String(t('inbox.delete')),
            onPress: () => {
              setMenu(null);
              setSingle(null);
              setModal('delete');
            },
          },
        ]
      : []),
  ];
  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={String(t('inbox.title'))}
        showSeparator={false}
        gradientColors={['rgba(5,31,24,0.70)', 'rgba(16,80,63,0.70)']}
        solidFallback="rgba(10,51,40,0.70)"
        rightIconName="qrcode-scan"
        onPressRight={() => navigation.navigate('Scanner')}
      />
      {loading ? (
        <View testID="inbox-loading" style={{ flex: 1 }}>
          <CenteredSpinner />
        </View>
      ) : (
        <FlatList
          ref={list}
          data={error ? [] : items}
          keyExtractor={x => x.id}
          contentContainerStyle={s.list}
          onScrollBeginDrag={() => setMenu(null)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor="#FFFFFF"
            />
          }
          onEndReached={() => {
            if (!moreError) void more();
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <AnimatedView
              style={[
                styleFor(item.id),
                { marginBottom: 12, zIndex: menu === item.id ? 30 : 0 },
              ]}
            >
              <NotificationTile
                item={item}
                open={menu === item.id}
                onToggle={() => setMenu(menu === item.id ? null : item.id)}
                onDelete={() => {
                  setMenu(null);
                  setSingle(item.id);
                  setModal('delete');
                }}
              />
            </AnimatedView>
          )}
          ListEmptyComponent={
            <AnimatedView style={[s.empty, styleFor('empty')]}>
              <Gradient
                colors={['rgba(16,80,63,0.9)', 'rgba(5,31,24,0.9)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
              />
              <Icon
                name={error ? 'alert-circle-outline' : 'bell-outline'}
                size={32}
                color="#FFFFFF"
              />
              <Text style={s.emptyTitle}>
                {t(error ? 'inbox.error' : 'inbox.emptyTitle')}
              </Text>
              <Text style={s.emptyText}>
                {t(error ? 'inbox.errorBody' : 'inbox.emptyBody')}
              </Text>
              {error && (
                <Pressable
                  accessibilityRole="button"
                  style={s.retry}
                  onPress={() => void load()}
                >
                  <Text style={s.emptyTitle}>{t('inbox.retry')}</Text>
                </Pressable>
              )}
            </AnimatedView>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ height: 60 }}>
                <CenteredSpinner size={28} />
              </View>
            ) : moreError ? (
              <Pressable
                accessibilityRole="button"
                style={s.retry}
                onPress={() => void more()}
              >
                <Text style={s.emptyTitle}>{t('inbox.retry')}</Text>
              </Pressable>
            ) : null
          }
        />
      )}
      <FAB
        actions={actions}
        position={settings.fabPosition || 'right'}
        bottomOffset={88}
        onInteraction={() => setMenu(null)}
      />
      <InboxModals
        mode={modal}
        query={query}
        single={!!single}
        busy={deleting}
        onClose={() => {
          setModal(null);
          setSingle(null);
        }}
        onApply={value => {
          setModal(null);
          setQuery(value);
          list.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        onDelete={scope => void remove(scope)}
      />
      <TopSnackbar
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onDismiss={() => setToast(current => ({ ...current, visible: false }))}
      />
    </View>
  );
}
const s = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 21,
    paddingBottom: 180,
    flexGrow: 1,
  },
  empty: {
    padding: 24,
    borderRadius: 28,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
});
