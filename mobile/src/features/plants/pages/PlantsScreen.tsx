// features/plants/screens/PlantsScreen.tsx
import React, { useCallback, useState } from "react";
import { View, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/plants.styles";
import { Plant } from "../types/plants.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  LATIN_CATALOG,
  USER_LOCATIONS,
} from "../constants/plants.constants";
import PlantTile from "../components/PlantTile";
import EditPlantModal from "../components/EditPlantModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

import { fetchPlantInstances, type ApiPlantInstanceListItem } from "../../../api/services/plant-instances.service";

function mapApiItemToPlant(item: ApiPlantInstanceListItem): Plant {
  const def = item.plant_definition || undefined;
  const loc = item.location || undefined;

  // Name priority: display_name > definition name > "Untitled"
  const name = (item.display_name?.trim() || def?.name?.trim() || "Untitled").trim();

  return {
    id: String(item.id),
    name,
    latin: def?.latin || undefined,
    location: loc?.name || undefined,
    notes: item.notes?.trim() || "",
  };
}

export default function PlantsScreen() {
  const nav = useNavigation();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
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
    try {
      setLoading(true);
      const data = await fetchPlantInstances({ auth: true });
      setPlants(data.map(mapApiItemToPlant));
    } catch (e) {
      console.warn("Failed to load plants", e);
      setPlants([]); // fallback to empty on error
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchPlantInstances({ auth: true });
      setPlants(data.map(mapApiItemToPlant));
    } catch (e) {
      console.warn("Refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  // Local-only edit (does not persist yet)
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

  // Local-only delete (you can wire backend later)
  const confirmDelete = () => {
    if (confirmDeleteId) {
      setPlants((prev) => prev.filter((p) => p.id !== confirmDeleteId));
    }
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

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

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PlantTile
              plant={item}
              isMenuOpen={menuOpenId === item.id}
              onPressBody={() => nav.navigate("PlantDetails" as never)}
              onPressMenu={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
              onEdit={() => openEditModal(item)}
              onReminders={() => {
                /* wire later */
              }}
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
      )}

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

      {/* EDIT MODAL */}
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
