// C:\Projekty\Python\Flovers\mobile\src\features\locations\pages\LocationsScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  Pressable,
  Easing,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider"; // 👈 NEW

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../../plants/constants/plants.constants";

import { locStyles as s } from "../styles/locations.styles";
import LocationTile from "../components/LocationTile";
import ConfirmDeleteLocationModal from "../components/modals/ConfirmDeleteLocationModal";
import SortLocationsModal, { SortDir, SortKey } from "../components/modals/SortLocationsModal";
import EditLocationModal from "../components/modals/EditLocationModal";

import type { PlantLocation } from "../types/locations.types";
import type { LocationCategory } from "../../create-plant/types/create-plant.types";

import {
  fetchUserLocations,
  createLocation,
  deleteLocation,
  type ApiLocation,
} from "../../../api/services/locations.service";

function norm(v?: string | null) {
  return (v || "").toLowerCase().trim();
}

function mapApiToLocation(api: ApiLocation): PlantLocation {
  const count = (api as any).plantCount ?? (api as any).plant_count ?? 0;

  return {
    id: api.id,
    name: api.name,
    plantCount: typeof count === "number" ? count : 0,
    category: api.category as LocationCategory,
  };
}

export default function LocationsScreen() {
  const nav = useNavigation();

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings(); // 👈 NEW

  // Safe t() (treat key-echo as missing)
  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const plantCountLabel = useCallback(
    (count: number) => {
      // EN: one/other
      // PL: one/few/many/other
      if (currentLanguage === "pl") {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (count === 1) return tr("locations.plantCount.one", "1 roślina", { count });
        if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
          return tr("locations.plantCount.few", "{{count}} rośliny", { count });
        }
        return tr("locations.plantCount.many", "{{count}} roślin", { count });
      }

      if (count === 1) return tr("locations.plantCount.one", "1 plant", { count });
      return tr("locations.plantCount.other", "{{count}} plants", { count });
    },
    [currentLanguage, tr]
  );

  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Toast / snackbar
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // Add/Edit Location modal
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "edit">("edit");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [editingCategory, setEditingCategory] =
    useState<LocationCategory>("indoor");

  // Confirm delete modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // Sort modal + state
  const [sortOpen, setSortOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Hide FAB when any modal is open
  const showFAB = !editOpen && !confirmDeleteId && !sortOpen;

  const load = useCallback(async () => {
    try {
      const data = await fetchUserLocations({ auth: true });
      setLocations(data.map(mapApiToLocation));
    } catch (e: any) {
      showToast(
        e?.message || tr("locations.toast.loadFailed", "Failed to load locations"),
        "error"
      );
      setLocations([]);
    }
  }, [tr]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      // reset modal/menu state when screen comes into focus
      setEditOpen(false);
      setEditingId(null);
      setEditingName("");
      setEditingCategory("indoor");
      setMenuOpenId(null);
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
      setSortOpen(false);

      (async () => {
        setLoading(true);
        setLocations([]); // avoid stale flash
        try {
          await load();
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // ---------- SORTED DERIVED LIST ----------
  const derivedLocations = useMemo(() => {
    const result = [...locations];
    result.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "name") {
        cmp = norm(a.name).localeCompare(norm(b.name));
      } else {
        cmp = a.plantCount - b.plantCount;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [locations, sortKey, sortDir]);

  // ---------- ENTRANCE ANIMATION ----------
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  const primeAnimations = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      const v = getAnimForId(id);
      v.setValue(0);
    });
  }, []);

  const runStaggerIn = useCallback((ids: string[]) => {
    const sequences = ids.map((id, i) => {
      const v = getAnimForId(id);
      return Animated.timing(v, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50,
      });
    });
    Animated.stagger(50, sequences).start();
  }, []);

  useEffect(() => {
    if (loading) return;
    const ids = derivedLocations.map((l) => l.id);
    primeAnimations(ids);
    const frameId = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(frameId);
  }, [loading, derivedLocations, derivedLocations.length, primeAnimations, runStaggerIn]);

  // ---------- EMPTY-STATE ANIMATION ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (derivedLocations.length === 0) {
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      emptyAnim.setValue(0);
    }
  }, [loading, derivedLocations.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  const handlePressLocationBody = (loc: PlantLocation) => {
    const label = plantCountLabel(loc.plantCount);
    showToast(`${loc.name}: ${label}`);
  };

  const openAddLocation = () => {
    setMenuOpenId(null);
    setEditingId(null);
    setEditingName("");
    setEditingCategory("indoor");
    setEditMode("create");
    setEditOpen(true);
  };

  const openEditLocation = (loc: PlantLocation) => {
    setMenuOpenId(null);
    setEditingId(loc.id);
    setEditingName(loc.name);
    setEditingCategory(loc.category);
    setEditMode("edit");
    setEditOpen(true);
  };

  const askDeleteLocation = (loc: PlantLocation) => {
    setMenuOpenId(null);
    setConfirmDeleteId(loc.id);
    setConfirmDeleteName(loc.name);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;

    try {
      await deleteLocation(confirmDeleteId, { auth: true });
      setLocations((prev) => prev.filter((l) => l.id !== confirmDeleteId));
      showToast(tr("locations.toast.deleted", "Location deleted"), "success");
    } catch (e: any) {
      const msg = e?.message || tr("locations.toast.deleteFailed", "Could not delete this location.");
      Alert.alert(tr("locations.alert.deleteFailedTitle", "Delete failed"), msg);
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  };

  const handleSaveLocation = async (name: string, category: LocationCategory) => {
    try {
      if (editMode === "create") {
        const created = await createLocation({ name, category }, { auth: true });
        const loc = mapApiToLocation(created);
        setLocations((prev) => [...prev, loc]);
        showToast(tr("locations.toast.added", "Location added"), "success");
      } else if (editMode === "edit" && editingId) {
        // No updateLocation API yet; update locally
        setLocations((prev) =>
          prev.map((l) => (l.id === editingId ? { ...l, name, category } : l))
        );
        showToast(
          tr("locations.toast.updatedLocal", "Location updated (local only)"),
          "success"
        );
      }
    } catch (e: any) {
      showToast(e?.message || tr("locations.toast.saveFailed", "Could not save location"), "error");
    } finally {
      setEditOpen(false);
      setEditingId(null);
      setEditingName("");
      setEditingCategory("indoor");
    }
  };

  const openSortModal = () => {
    setMenuOpenId(null);
    setSortOpen(true);
  };

  const resetSort = () => {
    setSortKey("name");
    setSortDir("asc");
    setSortOpen(false);
  };

  // Skeleton/loader
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={tr("locations.headerTitle", "Locations")}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={tr("locations.headerTitle", "Locations")}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />
      )}

      <Animated.FlatList
        style={{ flex: 1 }}
        data={derivedLocations}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
          const opacity = v;

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <LocationTile
                location={item}
                isMenuOpen={menuOpenId === item.id}
                onPressBody={() => handlePressLocationBody(item)}
                onPressMenu={() =>
                  setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                }
                onEdit={() => openEditLocation(item)}
                onDelete={() => askDeleteLocation(item)}
              />
            </Animated.View>
          );
        }}
        ListHeaderComponent={() => <View style={{ height: 0 }} />}
        ListFooterComponent={() => <View style={{ height: 200 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <Animated.View
            style={[
              s.emptyWrap,
              {
                opacity: emptyOpacity,
                transform: [{ translateY: emptyTranslateY }, { scale: emptyScale }],
              },
            ]}
          >
            <View style={s.emptyGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={20}
                overlayColor="transparent"
                reducedTransparencyFallbackColor="transparent"
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.20)" }]}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },
                ]}
              />

              <View style={s.emptyInner}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={26}
                  color="#FFFFFF"
                  style={{ marginBottom: 10 }}
                />
                <Text style={s.emptyTitle}>
                  {tr("locations.empty.title", "No locations yet")}
                </Text>
                <View style={s.emptyDescBox}>
                  <Text style={s.emptyText}>
                    {tr(
                      "locations.empty.description",
                      "Locations appear automatically when you assign them to your plants.\n\nEdit a plant and set its location to start grouping plants by rooms or areas."
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      />

      {showFAB && (
        <View
          onStartShouldSetResponderCapture={() => {
            setMenuOpenId(null);
            return false;
          }}
        >
          <FAB
            bottomOffset={92}
            position={settings.fabPosition} // 👈 NEW
            actions={[
              {
                key: "add",
                icon: "plus",
                label: tr("locations.fab.add", "Add location"),
                onPress: openAddLocation,
              },
              {
                key: "sort",
                icon: "sort",
                label: tr("locations.fab.sort", "Sort"),
                onPress: openSortModal,
              },
            ]}
          />
        </View>
      )}

      <EditLocationModal
        visible={editOpen}
        mode={editMode}
        initialName={editingName}
        initialCategory={editingCategory}
        onCancel={() => {
          setEditOpen(false);
          setEditingId(null);
          setEditingName("");
          setEditingCategory("indoor");
        }}
        onSave={handleSaveLocation}
      />

      <ConfirmDeleteLocationModal
        visible={!!confirmDeleteId}
        name={confirmDeleteName}
        onCancel={() => {
          setConfirmDeleteId(null);
          setConfirmDeleteName("");
        }}
        onConfirm={confirmDelete}
      />

      <SortLocationsModal
        visible={sortOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => setSortOpen(false)}
        onApply={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setSortOpen(false);
        }}
        onReset={resetSort}
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
