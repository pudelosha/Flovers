import React, { useState } from "react";
import { View, Pressable, FlatList, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";

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

export default function PlantsScreen() {
  const nav = useNavigation();

  // Demo data
  const [plants, setPlants] = useState<Plant[]>(
    Array.from({ length: 10 }).map((_, i) => ({
      id: String(i + 1),
      name: ["Big Awesome Monstera", "Fiddle Leaf Fig", "Aloe Vera", "Orchid", "Dracaena"][i % 5],
      latin: [
        "Monstera deliciosa",
        "Ficus lyrata",
        "Aloe vera",
        "Phalaenopsis aphrodite",
        "Dracaena fragrans",
      ][i % 5],
      location: ["Living Room", "Bedroom", "Kitchen", "Office", "Hallway"][i % 5],
      notes: "",
    }))
  );

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // --- EDIT MODAL state (dedicated) ---
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

  const openAddPage = () => {
    setMenuOpenId(null);
    nav.navigate("AddPlant" as never);
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
        showSeparator={false} // <<< remove the divider
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
            onPressBody={() => nav.navigate("PlantDetails" as never)}
            onPressMenu={() =>
              setMenuOpenId((curr) => (curr === item.id ? null : item.id))
            }
            onEdit={() => openEditModal(item)}
            onReminders={() => { /* wire later */ }}
            onDelete={() => askDelete(item)}
          />
        )}
        ListHeaderComponent={() => <View style={{ height: 5 }} />}
        // Add generous bottom padding so the final card clears the FAB + tab bar
        ListFooterComponent={() => <View style={{ height: 200 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        keyboardShouldPersistTaps="handled"
      />

      {/* Page FAB */}
      <FAB
        bottomOffset={92} // keep above the tab bar; tweak if your tab bar height changes
        actions={[
          { key: "add", icon: "plus", label: "Add plant", onPress: openAddPage },
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
