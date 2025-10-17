import React, { useCallback, useState } from "react";
import { View, Pressable, FlatList, Text, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/reminders.styles";
import ReminderTile from "../components/ReminderTile";
import type { Reminder as UIReminder } from "../types/reminders.types";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/reminders.constants";
import { listReminders, listReminderTasks, completeReminderTask } from "../../../api/services/reminders.service";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import { buildUIReminders } from "../../../api/serializers/reminders.serializer";
import ConfirmDeleteReminderModal from "../components/ConfirmDeleteReminderModal";
import EditReminderModal from "../components/EditReminderModal";

type ViewMode = "list" | "calendar";
type PlantOption = { id: string; name: string; location?: string };

// Map API plant instances to dropdown options
function mapPlantOptions(apiPlants: any[]): PlantOption[] {
  return (apiPlants || []).map((p) => ({
    id: String(p.id),
    name:
      (p.display_name?.trim()) ||
      (p.plant_definition?.name?.trim()) ||
      "Unnamed plant",
    location: p.location?.name || undefined,
  }));
}

export default function RemindersScreen() {
  const nav = useNavigation();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uiReminders, setUiReminders] = useState<UIReminder[]>([]);
  const [plantOptions, setPlantOptions] = useState<PlantOption[]>([]);

  // --- DELETE CONFIRMATION MODAL state ---
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // --- EDIT MODAL state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fType, setFType] = useState<"watering" | "moisture" | "fertilising" | "care" | "repot">("watering");
  const [fPlantId, setFPlantId] = useState<string | undefined>(undefined);
  const [fDueDate, setFDueDate] = useState<string>("");
  const [fIntervalValue, setFIntervalValue] = useState<number | undefined>(undefined);
  const [fIntervalUnit, setFIntervalUnit] = useState<"days" | "months">("days");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasks, reminders, plants] = await Promise.all([
        listReminderTasks({ status: "pending", auth: true }),
        listReminders({ auth: true }),
        fetchPlantInstances({ auth: true }),
      ]);
      const ui = buildUIReminders(tasks, reminders, plants);
      setUiReminders(ui);
      setPlantOptions(mapPlantOptions(plants));
    } catch (e: any) {
      setError(e?.message || "Failed to load reminders");
      setUiReminders([]);
      setPlantOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onToggleMenu = (id: string) =>
    setMenuOpenId((curr) => (curr === id ? null : id));

  const openList = () => setViewMode("list");
  const openCalendar = () => setViewMode("calendar");
  const openAddReminder = () => nav.navigate("AddReminder" as never);

  const onComplete = async (rid: string) => {
    setMenuOpenId(null);
    const idNum = Number(rid);
    if (!idNum) return;
    try {
      await completeReminderTask(idNum, { auth: true });
      await load();
    } catch {
      // TODO: toast/snackbar
    }
  };

  // --- DELETE FLOW (UI-only for now) ---
  const askDelete = (r: UIReminder) => {
    setConfirmDeleteId(r.id);
    setConfirmDeleteName(r.plant);
    setMenuOpenId(null);
  };

  const confirmDelete = () => {
    // UI-only for now
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
    setConfirmDeleteName("");
  };

  // --- EDIT FLOW (UI-only for now) ---
  const openEditModal = (r: UIReminder) => {
    setEditingId(r.id);
    setFType(r.type);
    const match = plantOptions.find((p) => p.name === r.plant);
    setFPlantId(match?.id);
    // YYYY-MM-DD
    const d = r.dueDate ? new Date(r.dueDate) : null;
    const iso =
      d && !isNaN(+d)
        ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
            d.getUTCDate()
          ).padStart(2, "0")}`
        : "";
    setFDueDate(iso);
    setFIntervalValue(r.intervalValue);
    setFIntervalUnit(r.intervalUnit || (r.type === "repot" ? "months" : "days"));
    setEditOpen(true);
    setMenuOpenId(null);
  };

  const closeEdit = () => setEditOpen(false);

  const onSaveEdit = () => {
    if (!editingId) return;
    // Local UI update only
    setUiReminders((prev) =>
      prev.map((it) => {
        if (it.id !== editingId) return it;
        const plant = plantOptions.find((p) => p.id === fPlantId);
        const newPlantName = plant?.name || it.plant;
        const newLocation = plant?.location || it.location;
        return {
          ...it,
          type: fType,
          plant: newPlantName,
          location: newLocation,
          dueDate: fDueDate || undefined,
          intervalValue: fIntervalValue,
          intervalUnit: fType === "repot" ? "months" : "days",
        };
      })
    );
    closeEdit();
  };

  const showFAB = !editOpen && !confirmDeleteId;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Reminders"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {/* Tap outside list to close any open tile menu */}
      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      {viewMode === "list" ? (
        <FlatList
          data={uiReminders}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ReminderTile
              reminder={item}
              isMenuOpen={menuOpenId === item.id}
              onToggleMenu={() => onToggleMenu(item.id)}
              onPressBody={() => {}}
              onEdit={() => openEditModal(item)}
              onDelete={() => askDelete(item)}
            />
          )}
          ListHeaderComponent={<View style={{ height: 5 }} />}
          ListFooterComponent={<View style={{ height: 140 }} />}
          contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setMenuOpenId(null)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={s.placeholderText}>No reminders</Text>
                <Text style={s.placeholderHint}>Pull to refresh or add a reminder.</Text>
                {error ? <Text style={[s.placeholderHint, { marginTop: 8 }]}>{error}</Text> : null}
              </View>
            ) : null
          }
        />
      ) : (
        <View style={s.calendarWrap}>
          <Text style={s.placeholderText}>Calendar view</Text>
          <Text style={s.placeholderHint}>Days with scheduled reminders will be highlighted here.</Text>
        </View>
      )}

      {showFAB && (
        <FAB
          actions={[
            { key: "add", label: "Add reminder", icon: "plus", onPress: openAddReminder },
            { key: "list", label: "List", icon: "view-list", onPress: openList },
            { key: "calendar", label: "Calendar", icon: "calendar-month", onPress: openCalendar },
            { key: "sort", label: "Sort", icon: "sort", onPress: () => { /* TODO */ } },
            { key: "filter", label: "Filter", icon: "filter-variant", onPress: () => { /* TODO */ } },
          ]}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteReminderModal
        visible={!!confirmDeleteId}
        name={confirmDeleteName}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      {/* EDIT REMINDER MODAL */}
      <EditReminderModal
        visible={editOpen}
        plants={plantOptions}
        fType={fType}
        setFType={setFType}
        fPlantId={fPlantId}
        setFPlantId={setFPlantId}
        fDueDate={fDueDate}
        setFDueDate={setFDueDate}
        fIntervalValue={fIntervalValue}
        setFIntervalValue={setFIntervalValue}
        fIntervalUnit={fIntervalUnit}
        setFIntervalUnit={setFIntervalUnit}
        onCancel={closeEdit}
        onSave={onSaveEdit}
      />
    </View>
  );
}
