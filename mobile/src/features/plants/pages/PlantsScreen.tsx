import React, { useCallback, useMemo, useState } from "react";
import { View, Pressable, FlatList, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/plants.styles";
import PlantTile from "../components/PlantTile";
import EditPlantModal from "../components/EditPlantModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

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
  const name = (item.display_name?.trim())
    || (item.plant_definition?.name?.trim())
    || "Unnamed plant";

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
      return () => { mounted = false; };
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
    // Placeholder local update (we'll switch to backend PATCH later)
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
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
        data={plants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PlantTile
            plant={item}
            isMenuOpen={menuOpenId === item.id}
            onPressBody={() => nav.navigate("PlantDetails" as never, { id: item.id } as never)}
            onPressMenu={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
            onEdit={() => openEditModal(item)}
            onReminders={() => { /* wire later */ }}
            onDelete={() => askDelete(item)}
          />
        )}
        ListHeaderComponent={() => <View style={{ height: 5 }} />}
        ListFooterComponent={() => <View style={{ height: 200 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Page FAB */}
      <FAB
        bottomOffset={92}
        actions={[
          { key: "create", icon: "plus", label: "Create plant", onPress: openCreatePlantWizard },
          { key: "sort", icon: "sort", label: "Sort", onPress: () => {/* TODO */} },
          { key: "filter", icon: "filter-variant", label: "Filter", onPress: () => {/* TODO */} },
          { key: "locations", icon: "map-marker-outline", label: "Locations", onPress: () => {/* TODO */} },
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
    </View>
  );
}
