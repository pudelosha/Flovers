// C:\Projekty\Python\Flovers\mobile\src\features\reminders\pages\RemindersScreen.tsx
import React, { useCallback, useState } from "react";
import { View, Pressable, FlatList, Text, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/reminders.styles";
import ReminderTile from "../components/ReminderTile";
import type { Reminder as UIReminder } from "../types/reminders.types";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/reminders.constants";
import {
  listReminders,
  listReminderTasks,
  completeReminderTask,
  updateReminder,
  deleteReminder,
  createReminder,                // ⬅️ NEW
} from "../../../api/services/reminders.service";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import { buildUIReminders } from "../../../api/serializers/reminders.serializer";
import ConfirmDeleteReminderModal from "../components/ConfirmDeleteReminderModal";
import EditReminderModal from "../components/EditReminderModal";

type ViewMode = "list" | "calendar";
type PlantOption = { id: string; name: string; location?: string };

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

// small helper
function todayISO() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
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
  const [confirmDeleteReminderId, setConfirmDeleteReminderId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // --- EDIT/CREATE MODAL state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null => CREATE mode

  const [fType, setFType] = useState<"watering" | "moisture" | "fertilising" | "care" | "repot">("watering");
  const [fPlantId, setFPlantId] = useState<string | undefined>(undefined);
  const [fDueDate, setFDueDate] = useState<string>("");
  const [fIntervalValue, setFIntervalValue] = useState<number | undefined>(undefined);
  const [fIntervalUnit, setFIntervalUnit] = useState<"days" | "months">("days");

  const uiTypeToApi = (t: "watering" | "moisture" | "fertilising" | "care" | "repot"):
    "water" | "moisture" | "fertilize" | "care" | "repot" =>
    t === "watering" ? "water" : t === "fertilising" ? "fertilize" : t;

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleMenu = (id: string) => setMenuOpenId((curr) => (curr === id ? null : id));
  const openList = () => setViewMode("list");
  const openCalendar = () => setViewMode("calendar");

  // ⬅️ FAB "Add" now opens the same modal in CREATE mode
  const openAddReminder = () => {
    setEditingId(null);                      // create mode
    setFType("watering");
    setFPlantId(undefined);
    setFDueDate(todayISO());
    setFIntervalValue(7);
    setFIntervalUnit("days");
    setEditOpen(true);
    setMenuOpenId(null);
  };

  const onComplete = async (rid: string) => {
    setMenuOpenId(null);
    const idNum = Number(rid);
    if (!idNum) return;
    try {
      await completeReminderTask(idNum, { auth: true });
      await load();
    } catch {}
  };

  // --- DELETE FLOW ---
  const askDelete = (r: UIReminder) => {
    setConfirmDeleteReminderId(r.reminderId);
    setConfirmDeleteName(r.plant);
    setMenuOpenId(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteReminderId(null);
    setConfirmDeleteName("");
  };

  const confirmDelete = async () => {
    try {
      if (!confirmDeleteReminderId) return;
      await deleteReminder(Number(confirmDeleteReminderId), { auth: true });
      setConfirmDeleteReminderId(null);
      setConfirmDeleteName("");
      await load();
    } catch {
      setConfirmDeleteReminderId(null);
      setConfirmDeleteName("");
    }
  };

  // --- EDIT FLOW ---
  const openEditModal = (r: UIReminder) => {
    setEditingId(r.reminderId);  // edit by reminder id
    setFType(r.type);
    if (r.plantId) {
      setFPlantId(r.plantId);
    } else {
      const match = plantOptions.find((p) => p.name === r.plant);
      setFPlantId(match?.id);
    }

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

  // ⬅️ Save handler: create when editingId === null; otherwise update
  const onSaveEdit = async () => {
    if (!fPlantId || !fDueDate || !fIntervalValue) return;

    try {
      const payload = {
        plant: Number(fPlantId),
        type: uiTypeToApi(fType),
        start_date: fDueDate,
        interval_value: Number(fIntervalValue),
        interval_unit: fType === "repot" ? "months" : "days" as const,
      };

      if (editingId === null) {
        // CREATE
        await createReminder(payload, { auth: true });
      } else {
        // UPDATE
        await updateReminder(Number(editingId), payload, { auth: true });
      }

      setEditOpen(false);
      await load();
    } catch {
      setEditOpen(false);
    }
  };

  const showFAB = !editOpen && !confirmDeleteReminderId;

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
            { key: "add", label: "Add reminder", icon: "plus", onPress: openAddReminder }, // ⬅️ opens modal
            { key: "list", label: "List", icon: "view-list", onPress: openList },
            { key: "calendar", label: "Calendar", icon: "calendar-month", onPress: openCalendar },
            { key: "sort", label: "Sort", onPress: () => {} , icon: "sort" },
            { key: "filter", label: "Filter", onPress: () => {}, icon: "filter-variant" },
          ]}
        />
      )}

      <ConfirmDeleteReminderModal
        visible={!!confirmDeleteReminderId}
        name={confirmDeleteName}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      <EditReminderModal
        visible={editOpen}
        mode={editingId === null ? "create" : "edit"}   // ⬅️ drive title + CTA
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
