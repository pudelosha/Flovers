import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ListRenderItemInfo,
  FlatList as RNFlatList,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { s } from "../styles/plants.styles";
import { Plant, FormMode } from "../types/plants.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  LATIN_CATALOG,
  USER_LOCATIONS,
} from "../constants/plants.constants";
import PlantTile from "../components/PlantTile";
import AddEditPlantModal from "../components/AddEditPlantModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

export default function PlantsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

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

  // Modal: add/edit (controlled values)
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(undefined);
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // OPEN ADD FIRST, THEN CLOSE MENU
  const openAddModal = () => {
    setMode("add");
    setEditingId(null);
    setFName("");
    setFLatinQuery("");
    setFLatinSelected(undefined);
    setFLocation(undefined);
    setFNotes("");
    setModalOpen(true);
    setMenuOpenId(null);
  };

  // OPEN EDIT FIRST, THEN CLOSE MENU
  const openEditModal = (p: Plant) => {
    setMode("edit");
    setEditingId(p.id);
    setFName(p.name);
    setFLatinQuery(p.latin || "");
    setFLatinSelected(p.latin);
    setFLocation(p.location);
    setFNotes(p.notes || "");
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const onSave = () => {
    if (!fName.trim()) return;

    if (mode === "add") {
      const newPlant: Plant = {
        id: String(Date.now()),
        name: fName.trim(),
        latin: (fLatinSelected || fLatinQuery || "").trim() || undefined,
        location: fLocation,
        notes: fNotes.trim() || undefined,
      };
      setPlants(prev => [newPlant, ...prev]);
    } else if (mode === "edit" && editingId) {
      setPlants(prev =>
        prev.map(p =>
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
    }
    closeModal();
  };

  // ASK DELETE FIRST, THEN CLOSE MENU
  const askDelete = (p: Plant) => {
    setConfirmDeleteId(p.id);
    setConfirmDeleteName(p.name);
    setMenuOpenId(null);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      setPlants(prev => prev.filter(p => p.id !== confirmDeleteId));
    }
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

  const renderPlant = ({ item }: ListRenderItemInfo<Plant>) => {
    const isMenuOpen = menuOpenId === item.id;

    return (
      <PlantTile
        plant={item}
        isMenuOpen={isMenuOpen}
        onPressBody={() => nav.navigate("PlantDetails" as never)}
        onPressMenu={() => setMenuOpenId(curr => (curr === item.id ? null : item.id))}
        onEdit={() => openEditModal(item)}
        onReminders={() => { /* wire later */ }}
        onDelete={() => askDelete(item)}
      />
    );
  };

  // keep catalog import “used”
  void LATIN_CATALOG; void USER_LOCATIONS;

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER via shared GlassHeader */}
      <GlassHeader
        title="Plants"
        rightAction={{ icon: "qrcode-scan", onPress: () => nav.navigate("Scanner" as never) }}
        gradientColors={HEADER_GRADIENT_TINT}
        fallbackColor={HEADER_SOLID_FALLBACK}
        topPaddingExtra={10}
      >
        {/* 4-button submenu (add, sort, filter, locations) */}
        <View style={s.subRow4}>
          <View style={s.subColLeft}>
            <Pressable style={s.subBtn} hitSlop={8} onPress={openAddModal}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>add</Text>
                <MaterialCommunityIcons name="plus-circle-outline" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>

          <View style={s.subColMidLeft}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>sort</Text>
                <MaterialCommunityIcons name="sort" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>

          <View style={s.subColMidRight}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>filter</Text>
                <MaterialCommunityIcons name="filter-variant" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>

          <View style={s.subColRight}>
            <Pressable style={s.subBtn} hitSlop={8}>
              <View style={s.subBtnInner}>
                <Text style={s.subBtnText}>locations</Text>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#FFFFFF" style={s.subIcon} />
              </View>
            </Pressable>
          </View>
        </View>
      </GlassHeader>

      {/* Tap outside list to close any open tile menu */}
      {menuOpenId && <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />}

      <RNFlatList<Plant>
        data={plants}
        keyExtractor={(p) => p.id}
        renderItem={renderPlant}
        ListHeaderComponent={() => <View style={{ height: 5 }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        keyboardShouldPersistTaps="handled"
      />

      {/* ADD / EDIT MODAL */}
      <AddEditPlantModal
        visible={modalOpen}
        mode={mode}
        fName={fName} setFName={setFName}
        fLatinQuery={fLatinQuery} setFLatinQuery={setFLatinQuery}
        fLatinSelected={fLatinSelected} setFLatinSelected={setFLatinSelected}
        fLocation={fLocation} setFLocation={setFLocation}
        fNotes={fNotes} setFNotes={setFNotes}
        onCancel={closeModal}
        onSave={onSave}
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
