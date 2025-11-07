import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  RefreshControl,
  Animated,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/task-history.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/task-history.constants";
import TaskHistoryTile from "../components/TaskHistoryTile";
import type { TaskHistoryItem } from "../types/task-history.types";

// 🔹 NEW: import history fetcher (completed tasks only)
import { fetchHomeHistoryTasks } from "../../../api/services/home.service";

type RouteParams = {
  plantId?: string; // optional: when passed, show history for one plant
};

export default function TaskHistoryScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const params = (route?.params || {}) as RouteParams;
  const plantIdFilter = params.plantId;

  const [items, setItems] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const listRef = useRef<Animated.FlatList<TaskHistoryItem>>(null);

  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // 🔹 Load COMPLETED tasks via home history service
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHomeHistoryTasks();
      const allItems = data as unknown as TaskHistoryItem[];

      const filtered = plantIdFilter
        ? allItems.filter((x) => (x as any).plantId === plantIdFilter)
        : allItems;

      setItems(filtered);
    } catch (e: any) {
      showToast(e?.message || "Failed to load task history", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [plantIdFilter]);

  // Refresh on focus (clear stale list first)
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        setItems([]);
        try {
          await load();
        } finally {
          if (!mounted) return;
        }
      })();
      return () => {
        mounted = false;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // ---------- ✨ ENTRANCE ANIMATION (tiles) ----------
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  useEffect(() => {
    if (loading) return;
    const ids = items.map((x) => x.id);
    ids.forEach((id) => getAnimForId(id).setValue(0));

    const seq = ids.map((id, i) =>
      Animated.timing(getAnimForId(id), {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
        delay: i * 50,
      })
    );
    Animated.stagger(50, seq).start();
  }, [loading, items.length]);

  // ---------- ✨ EMPTY-STATE FRAME ANIMATION ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (items.length === 0) {
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      emptyAnim.setValue(0);
    }
  }, [loading, items.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  // Early return while loading (match other screens)
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Task history"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate("Scanner" as never)}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Task history"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          });
          const scale = v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          });
          const opacity = v;

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <TaskHistoryTile item={item} />
            </Animated.View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={<View style={{ height: 0 }} />}
        ListFooterComponent={<View style={{ height: 180 }} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View
              style={[
                s.emptyWrap,
                {
                  opacity: emptyOpacity,
                  transform: [{ translateY: emptyTranslateY }, { scale: emptyScale }],
                },
              ]}
            >
              <View style={{ borderRadius: 28, overflow: "hidden", minHeight: 140 }}>
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={20}
                  overlayColor="transparent"
                  reducedTransparencyFallbackColor="transparent"
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(255,255,255,0.20)" },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      borderRadius: 28,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                    },
                  ]}
                />
                <View style={s.emptyInner}>
                  <MaterialCommunityIcons
                    name="history"
                    size={26}
                    color="#FFFFFF"
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={s.emptyTitle}>No completed tasks yet</Text>
                  <View style={s.emptyDescBox}>
                    <Text style={s.emptyText}>
                      This screen will show{" "}
                      <Text style={s.inlineBold}>closed reminder tasks</Text> from
                      your Home page (pending tasks are not shown).
                      {"\n\n"}
                      {plantIdFilter
                        ? `Currently filtered to plant id ${plantIdFilter}.`
                        : "Open it from a specific task to see history just for that plant."}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null
        }
      />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
