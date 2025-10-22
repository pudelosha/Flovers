import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
  Text,
  StyleSheet,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import { s } from "../styles/plants.styles";
import PlantTile from "../components/PlantTile";
import EditPlantModal from "../components/EditPlantModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import SortPlantsModal from "../components/SortPlantsModal";
import FilterPlantsModal from "../components/FilterPlantsModal";

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  LATIN_CATALOG,
  USER_LOCATIONS,
} from "../constants/plants.constants";

import type { Plant } from "../types/plants.types";
import {
  fetchPlantInstances,
  deletePlantInstance,
  ApiPlantInstanceListItem,
} from "../../../api/services/plant-instances.service";

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

type SortKey = "name" | "location";
type SortDir = "asc" | "desc";
type Filters = { location?: string; latin?: string };

export default function PlantsScreen() {
  const nav = useNavigation();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // --- EDIT MODAL state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(undefined);
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // ---- SORT / FILTER ----
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<Filters>({});

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => p.location && set.add(p.location));
    USER_LOCATIONS.forEach((l) => set.add(l)); // include user-known
    return Array.from(set).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [plants]);

  const latinOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => p.latin && set.add(p.latin));
    LATIN_CATALOG.forEach((l) => set.add(l));
    return Array.from(set).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [plants]);

  const load = useCallback(async () => {
    const data = await fetchPlantInstances({ auth: true });
    setPlants(data.map(mapApiToPlant));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
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

  const openEditModal = (p: Plant) => {
    setEditingId(p.id);
    setFName(p.name);
    setFLatinQuery(p.latin || "");
    setFLatinSelected(p.latin);
    setFLocation(p.location);
    setFNotes(p.notes || "");
    setEditOpen(true);
    setMenuOpenId(null);
  };

  const closeEdit = () => setEditOpen(false);

  const onUpdate = () => {
    if (!editingId || !fName.trim()) return;
    setPlants((prev) =>
      prev.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: fName.trim(),
              latin: (fLatinSelected || fLatinQuery || "").trim() || undefined,
              location: fLocation,
              notes: fNotes.trim() || undefined,
            }
          : p
      )
    );
    closeEdit();
  };

  const askDelete = (p: Plant) => {
    setConfirmDeleteId(p.id);
    setConfirmDeleteName(p.name);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deletePlantInstance(Number(confirmDeleteId), { auth: true });
      setPlants((prev) => prev.filter((p) => p.id !== confirmDeleteId));
    } catch (e: any) {
      Alert.alert("Delete failed", e?.message || "Could not delete this plant.");
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  };

  // ---- Derived list (filter then sort) ----
  const derivedPlants = useMemo(() => {
    const norm = (v?: string) => (v || "").toLowerCase().trim();
    const filtered = plants.filter((p) => {
      if (filters.location && norm(p.location) !== norm(filters.location)) return false;
      if (filters.latin && norm(p.latin) !== norm(filters.latin)) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = sortKey === "name" ? a.name : (a.location || "");
      const bv = sortKey === "name" ? b.name : (b.location || "");
      const cmp = av.toLowerCase().localeCompare(bv.toLowerCase());
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [plants, filters, sortKey, sortDir]);

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

      {/* Tap outside list to close any open tile menu */}
      {menuOpenId && <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />}

      <FlatList
        style={{ flex: 1 }}
        data={derivedPlants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
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
        )}
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
                blurAmount={20} // match Profile
                overlayColor="transparent"
                reducedTransparencyFallbackColor="transparent"
              />
              {/* single tint + single thin border (no duplicates), same as Profile/Reminders */}
              <View pointerEvents="none" style={s.emptyTint} />
              <View pointerEvents="none" style={s.emptyBorder} />

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
                    Tap the <Text style={s.inlineBold}>“+” button</Text> in the bottom-right corner to add your
                    first plant. The Create Plant Wizard will help you set up your plant and specify its
                    parameters, as well as schedule reminders.{"\n\n"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Page FAB */}
      <FAB
        bottomOffset={92}
        actions={[
          { key: "create", icon: "plus", label: "Create plant", onPress: openCreatePlantWizard },
          { key: "sort", icon: "sort", label: "Sort", onPress: () => setSortOpen(true) },
          { key: "filter", icon: "filter-variant", label: "Filter", onPress: () => setFilterOpen(true) },
          { key: "locations", icon: "map-marker-outline", label: "Locations", onPress: () => {} },
        ]}
      />

      {/* EDIT MODAL (local-only for now) */}
      <EditPlantModal
        visible={editOpen}
        latinCatalog={LATIN_CATALOG}
        locations={USER_LOCATIONS}
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
        onCancel={closeEdit}
        onSave={onUpdate}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        visible={!!confirmDeleteId}
        name={confirmDeleteName}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {/* SORT / FILTER MODALS */}
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
          setSortKey("name");
          setSortDir("asc");
          setSortOpen(false);
        }}
      />

      <FilterPlantsModal
        visible={filterOpen}
        locations={locationOptions}
        latins={latinOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
        onClearAll={() => setFilters({})}
      />
    </View>
  );
}
