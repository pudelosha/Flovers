// C:\Projekty\Python\Flovers\mobile\src\features\plants\PlantsScreen.tsx
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  RefreshControl,
  Alert,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { s } from "../styles/plants.styles";
import PlantTile from "../components/PlantTile";
import EditPlantModal from "../components/EditPlantModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

import SortPlantsModal, { SortDir, SortKey } from "../components/SortPlantsModal";
import FilterPlantsModal from "../components/FilterPlantsModal";

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/plants.constants";

import type { Plant } from "../types/plants.types";
import {
  fetchPlantInstances,
  deletePlantInstance,
  ApiPlantInstanceListItem,
  fetchPlantInstanceForEdit,
  updatePlantInstanceFromForm,
} from "../../../api/services/plant-instances.service";

type LightLevel5 = "very-low" | "low" | "medium" | "bright-indirect" | "bright-direct";

/** Map API list item -> UI Plant shape used by PlantTile */
function mapApiToPlant(item: ApiPlantInstanceListItem): Plant {
  const name =
    item.display_name?.trim() ||
    item.plant_definition?.name?.trim() ||
    "Unnamed plant";

  const latin = item.plant_definition?.latin || undefined;
  const location = item.location?.name || undefined;

  return {
    id: String(item.id),
    name,
    latin,
    location,
    notes: item.notes || "",
  };
}

function norm(v?: string) {
  return (v || "").toLowerCase().trim();
}

export default function PlantsScreen() {
  const nav = useNavigation();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // --- TOAST / SNACKBAR STATE (same API as Reminders) ---
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

  // --- EDIT MODAL visibility & target ---
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- EDIT MODAL controlled fields (include FULL detail fields) ---
  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(undefined);
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  const [fPurchaseDateISO, setFPurchaseDateISO] = useState<string | null | undefined>(null);
  const [fLightLevel, setFLightLevel] = useState<LightLevel5>("medium");
  const [fOrientation, setFOrientation] = useState<"N" | "E" | "S" | "W">("S");
  const [fDistanceCm, setFDistanceCm] = useState<number>(0);
  const [fPotMaterial, setFPotMaterial] = useState<string | undefined>(undefined);
  const [fSoilMix, setFSoilMix] = useState<string | undefined>(undefined);

  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- SORT / FILTER state ---
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("plant");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<{ location?: string; latin?: string }>({});

  // ⬇️ Always hide the Edit modal whenever this screen becomes focused
  useFocusEffect(
    useCallback(() => {
      setEditOpen(false);
      setEditingId(null);
      setMenuOpenId(null);
      // no cleanup needed here
      return undefined;
    }, [])
  );

  const load = useCallback(async () => {
    const data = await fetchPlantInstances({ auth: true });
    setPlants(data.map(mapApiToPlant));
  }, []);

  // Show spinner on focus, clear stale tiles (so list is empty), then load fresh data
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        setPlants([]); // clear to avoid stale flash
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openCreatePlantWizard = () => {
    setMenuOpenId(null);
    nav.navigate("CreatePlantWizard" as never);
  };

  /** Fetch FULL detail, then open modal with populated fields */
  const openEditModal = async (p: Plant) => {
    setMenuOpenId(null);
    setEditingId(p.id);
    setEditLoading(true);

    try {
      // Pre-fill with what we have from the list (so UI feels snappy)
      setFName(p.name);
      setFLatinQuery(p.latin || "");
      setFLatinSelected(p.latin);
      setFLocation(p.location);
      setFNotes(p.notes || "");

      // Fetch full details needed by the modal controls
      const detail = await fetchPlantInstanceForEdit(Number(p.id), { auth: true });

      // display fields
      if (detail.display_name !== undefined && detail.display_name !== null)
        setFName(detail.display_name || "");
      if (detail.notes !== undefined && detail.notes !== null)
        setFNotes(detail.notes || "");
      setFPurchaseDateISO(
        detail.purchase_date === undefined ? null : detail.purchase_date
      );

      // exposure
      setFLightLevel((detail.light_level as LightLevel5) || "medium");
      setFOrientation((detail.orientation as any) || "S");
      setFDistanceCm(detail.distance_cm ?? 0);

      // pot/soil
      setFPotMaterial(detail.pot_material ?? undefined);
      setFSoilMix(detail.soil_mix ?? undefined);

      // latin/location (nested read)
      setFLatinQuery(detail.plant_definition?.name || p.latin || "");
      setFLatinSelected(detail.plant_definition?.name || p.latin || undefined);
      setFLocation(detail.location?.name || p.location);

      setEditOpen(true);
    } catch (e: any) {
      Alert.alert("Load failed", e?.message || "Could not load plant details.");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => setEditOpen(false);

  /** Build PATCH from modal state, send to API, then update local list item */
  const onUpdate = async () => {
    if (!editingId) return;
    if (!fName.trim()) return;

    setSaving(true);
    try {
      const form = {
        display_name: fName.trim(),
        notes: fNotes ?? "",
        purchase_date: fPurchaseDateISO ?? null,
        light_level: fLightLevel,
        orientation: fOrientation,
        distance_cm: fDistanceCm,
        pot_material: fPotMaterial ?? "",
        soil_mix: fSoilMix ?? "",
      } as const;

      const updatedListItem = await updatePlantInstanceFromForm(Number(editingId), form, { auth: true });

      setPlants((prev) =>
        prev.map((p) => (p.id === editingId ? mapApiToPlant(updatedListItem) : p))
      );

      closeEdit();
      // ✅ success toast
      showToast("Plant updated", "success");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Could not update this plant.");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (p: Plant) => {
    setConfirmDeleteId(p.id);
    setConfirmDeleteName(p.name);
    setMenuOpenId(null);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deletePlantInstance(Number(confirmDeleteId), { auth: true });
      setPlants((prev) => prev.filter((p) => p.id !== confirmDeleteId));
      // ✅ success toast
      showToast("Plant deleted", "success");
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message || "Could not delete this plant.");
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  };

  // ------- Derive dropdown options from fetched plants -------
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => p.location && set.add(p.location));
    return Array.from(set).sort((a, b) => norm(a).localeCompare(norm(b)));
  }, [plants]);

  const latinOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => p.latin && set.add(p.latin));
    return Array.from(set).sort((a, b) => norm(a).localeCompare(norm(b)));
  }, [plants]);

  // ------- Apply filters + sort -------
  const derivedPlants = useMemo(() => {
    const filtered = plants.filter((p) => {
      if (filters.location && norm(p.location) !== norm(filters.location)) return false;
      if (filters.latin && norm(p.latin) !== norm(filters.latin)) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "plant") {
        cmp = norm(a.name).localeCompare(norm(b.name));
      } else {
        cmp = norm(a.location).localeCompare(norm(b.location));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [plants, filters, sortKey, sortDir]);

  // ➕ Determine if any filter is active (to show "Clear filter" action like Reminders page)
  const isFilterActive = useMemo(() => {
    return Boolean(filters.location || filters.latin);
  }, [filters.location, filters.latin]);

  // Hide FAB when ANY modal is visible (edit, delete, sort, filter)
  const showFAB = !editOpen && !confirmDeleteId && !sortOpen && !filterOpen;

  // ---------- ✨ ENTRANCE ANIMATION (mirrors Home) ----------
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

  // Start animation when loading finishes or the derived list changes in size
  useEffect(() => {
    if (loading) return;
    const ids = derivedPlants.map((p) => p.id);
    primeAnimations(ids);
    const id = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, derivedPlants.length]);

  // Skeleton/loader
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Plants"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate("Scanner" as never)}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Plants"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
        showSeparator={false}
      />

      {menuOpenId && <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />}

      <Animated.FlatList
        style={{ flex: 1 }}
        data={derivedPlants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
          const opacity = v;

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <PlantTile
                plant={item}
                isMenuOpen={menuOpenId === item.id}
                onPressBody={() =>
                  nav.navigate("PlantDetails" as never, { id: item.id } as never)
                }
                onPressMenu={() =>
                  setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                }
                onEdit={() => openEditModal(item)}
                onReminders={() => {}}
                onDelete={() => askDelete(item)}
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
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={s.emptyWrap}>
            <View style={s.emptyGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={20}
                overlayColor="transparent"
                reducedTransparencyFallbackColor="transparent"
              />
              {/* White tint for readability */}
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.20)" }]}
              />
              {/* Thin border */}
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },
                ]}
              />

              <View style={s.emptyInner}>
                <MaterialCommunityIcons
                  name="sprout-outline"
                  size={26}
                  color="#FFFFFF"
                  style={{ marginBottom: 10 }}
                />
                <Text style={s.emptyTitle}>No plants yet</Text>
                <View style={s.emptyDescBox}>
                  <Text style={s.emptyText}>
                    Tap the <Text style={s.inlineBold}>“+” button</Text> in the
                    bottom-right corner to add your first plant. The Create Plant Wizard will help
                    you set up your plant and specify its parameters, as well as schedule
                    reminders.{"\n\n"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Only show when no modal is open */}
      {showFAB && (
        <FAB
          bottomOffset={92}
          actions={[
            { key: "create", icon: "plus", label: "Create plant", onPress: openCreatePlantWizard },
            { key: "sort", icon: "sort", label: "Sort", onPress: () => setSortOpen(true) },
            { key: "filter", icon: "filter-variant", label: "Filter", onPress: () => setFilterOpen(true) },
            ...(isFilterActive
              ? [
                  {
                    key: "clearFilter",
                    label: "Clear filter",
                    icon: "filter-remove",
                    onPress: () => setFilters({}),
                  } as const,
                ]
              : []),
            { key: "locations", icon: "map-marker-outline", label: "Locations", onPress: () => {} },
          ]}
        />
      )}

      <EditPlantModal
        visible={editOpen}
        latinCatalog={latinOptions}
        locations={locationOptions}
        // existing fields
        fName={fName}
        setFName={setFName}
        fLatinQuery={fLatinQuery}
        setFLatinQuery={setFLatinQuery}
        fLatinSelected={fLatinSelected}
        setFLatinSelected={setFLatinSelected}
        fLocation={fLocation}
        setFLocation={setFLocation}
        fNotes={fNotes}
        setFNotes={setFNotes}
        // full detail fields
        fPurchaseDateISO={fPurchaseDateISO ?? null}
        setFPurchaseDateISO={setFPurchaseDateISO}
        fLightLevel={fLightLevel}
        setFLightLevel={setFLightLevel}
        fOrientation={fOrientation}
        setFOrientation={setFOrientation}
        fDistanceCm={fDistanceCm}
        setFDistanceCm={setFDistanceCm}
        fPotMaterial={fPotMaterial}
        setFPotMaterial={setFPotMaterial}
        fSoilMix={fSoilMix}
        setFSoilMix={setFSoilMix}
        onCancel={closeEdit}
        onSave={onUpdate}
      />

      <ConfirmDeleteModal
        visible={!!confirmDeleteId}
        name={confirmDeleteName}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <SortPlantsModal
        visible={sortOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => setSortOpen(false)}
        onApply={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setSortOpen(false);
        }}
        onReset={() => {
          setSortKey("plant");
          setSortDir("asc");
          setSortOpen(false);
        }}
      />

      <FilterPlantsModal
        visible={filterOpen}
        locations={locationOptions}
        latinOptions={latinOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
        onClearAll={() => setFilters({})}
      />

      {(editLoading || saving) && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
          <CenteredSpinner size={46} color="#FFFFFF" />
        </View>
      )}

      {/* Top Snackbar (toast) */}
      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
