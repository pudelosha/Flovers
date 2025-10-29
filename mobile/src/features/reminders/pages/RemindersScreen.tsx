import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  RefreshControl,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
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
import { s } from "../styles/reminders.styles";
import ReminderTile from "../components/ReminderTile";
import RemindersCalendar from "../components/RemindersCalendar";
import type { Reminder as UIReminder, ReminderType } from "../types/reminders.types";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/reminders.constants";
import {
  listReminders,
  listReminderTasks,
  completeReminderTask,
  updateReminder,
  deleteReminder,
  createReminder,
} from "../../../api/services/reminders.service";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import { buildUIReminders } from "../../../api/serializers/reminders.serializer";
import ConfirmDeleteReminderModal from "../components/ConfirmDeleteReminderModal";
import EditReminderModal from "../components/EditReminderModal";
import SortRemindersModal from "../components/SortRemindersModal";
import FilterRemindersModal from "../components/FilterRemindersModal";

type ViewMode = "list" | "calendar";
type PlantOption = { id: string; name: string; location?: string };

type SortKey = "dueDate" | "plant" | "location";
type SortDir = "asc" | "desc";

/** Filters kept local; reset on screen focus per your request */
type Filters = {
  plantId?: string;          // selected plant id (or undefined for Any)
  location?: string;         // selected location string (or undefined for Any)
  types?: ReminderType[];    // selected types (multi)
  dueFrom?: string;          // ISO yyyy-mm-dd
  dueTo?: string;            // ISO yyyy-mm-dd
};

// small helper
function todayISO() {
  const d = new Date();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function mapPlantOptions(apiPlants: any[]): PlantOption[] {
  return (apiPlants || []).map((p) => ({
    id: String(p.id),
    name:
      p.display_name?.trim() ||
      p.plant_definition?.name?.trim() ||
      "Unnamed plant",
    location: p.location?.name || undefined,
  }));
}

function normalizeStr(v?: string) {
  return (v || "").toLowerCase().trim();
}

function parseISODate(d?: string | Date): Date | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (!(dt instanceof Date) || isNaN(+dt)) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Centralized initial filters */
const INITIAL_FILTERS: Filters = {
  plantId: undefined,
  location: undefined,
  types: [],
  dueFrom: "",
  dueTo: "",
};

export default function RemindersScreen() {
  const nav = useNavigation();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uiReminders, setUiReminders] = useState<UIReminder[]>([]);
  const [plantOptions, setPlantOptions] = useState<PlantOption[]>([]);
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of plantOptions) if (p.location) set.add(p.location);
    for (const r of uiReminders) if (r.location) set.add(r.location);
    return Array.from(set).sort((a, b) => normalizeStr(a).localeCompare(normalizeStr(b)));
  }, [plantOptions, uiReminders]);

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

  // --- SORT / FILTER UI STATE ---
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  // --- TOAST / SNACKBAR STATE ---
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");
  const showToast = (message: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

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
      setHasLoadedOnce(true);
    } catch (e: any) {
      setError(e?.message || "Failed to load reminders");
      setUiReminders([]);
      setPlantOptions([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Keep existing data refresh on focus, but clear stale tiles immediately so none are visible */
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        setUiReminders([]); // clear stale list before fetching
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

  /** Reset filters whenever screen is focused */
  useFocusEffect(
    useCallback(() => {
      setFilters(INITIAL_FILTERS);
      setFilterOpen(false);
      setSortOpen(false);
      setMenuOpenId(null);
    }, [])
  );

  /** ALWAYS close all modals and menus when this screen becomes focused */
  useFocusEffect(
    useCallback(() => {
      setEditOpen(false);
      setEditingId(null);
      setConfirmDeleteReminderId(null);
      setConfirmDeleteName("");
      setSortOpen(false);
      setFilterOpen(false);
      setMenuOpenId(null);
      return undefined;
    }, [])
  );

  // ⬅️ dedicated pull-to-refresh handler (does not toggle `loading`)
  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onToggleMenu = (id: string) => setMenuOpenId((curr) => (curr === id ? null : id));
  const openList = () => setViewMode("list");
  const openCalendar = () => setViewMode("calendar");

  // Swipe: toggle on every horizontal swipe (left or right)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
          const dx = Math.abs(g.dx);
          const dy = Math.abs(g.dy);
          return dx > 24 && dx > dy * 1.5;
        },
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) >= 40) {
            setViewMode((prev) => (prev === "list" ? "calendar" : "list"));
          }
        },
      }),
    []
  );

  // FAB "Add" opens the same modal in CREATE mode
  const openAddReminder = () => {
    setEditingId(null);
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
      showToast("Reminder deleted", "success");
    } catch (e: any) {
      setConfirmDeleteReminderId(null);
      setConfirmDeleteName("");
      showToast(e?.message ? `Delete failed: ${e.message}` : "Delete failed", "error");
    }
  };

  // --- EDIT FLOW ---
  const openEditModal = (r: UIReminder) => {
    setEditingId(r.reminderId);
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

  // Save handler: create when editingId === null; otherwise update
  const onSaveEdit = async () => {
    if (!fPlantId || !fDueDate || !fIntervalValue) return;

    const isCreate = editingId === null;

    try {
      const payload = {
        plant: Number(fPlantId),
        type: uiTypeToApi(fType),
        start_date: fDueDate,
        interval_value: Number(fIntervalValue),
        interval_unit: (fType === "repot" ? "months" : "days") as const,
      };

      if (isCreate) {
        await createReminder(payload, { auth: true });
      } else {
        await updateReminder(Number(editingId), payload, { auth: true });
      }

      setEditOpen(false);
      await load();
      showToast(isCreate ? "Reminder created" : "Reminder updated", "success");
    } catch (e: any) {
      setEditOpen(false);
      showToast(
        isCreate
          ? e?.message ? `Create failed: ${e.message}` : "Create failed"
          : e?.message ? `Update failed: ${e.message}` : "Update failed",
        "error"
      );
    }
  };

  // ===== FILTER + SORT (derived data) =====
  const derivedReminders = useMemo(() => {
    const typesSet = new Set(filters.types || []);
    const from = parseISODate(filters.dueFrom);
    const to = parseISODate(filters.dueTo);

    const filtered = uiReminders.filter((r) => {
      if (filters.plantId) {
        if (r.plantId) {
          if (r.plantId !== filters.plantId) return false;
        } else {
          const plant = plantOptions.find((p) => p.id === filters.plantId);
          if (plant && normalizeStr(r.plant) !== normalizeStr(plant.name)) return false;
        }
      }
      if (filters.location && normalizeStr(r.location) !== normalizeStr(filters.location)) return false;
      if (typesSet.size > 0 && !typesSet.has(r.type)) return false;

      if (from || to) {
        const rd = parseISODate(
          typeof r.dueDate === "string" || r.dueDate instanceof Date ? r.dueDate : undefined
        );
        if (!rd) return false;
        if (from && rd < from) return false;
        if (to && rd > to) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;

      if (sortKey === "dueDate") {
        const ad = parseISODate(a.dueDate as any);
        const bd = parseISODate(b.dueDate as any);
        if (ad && bd) cmp = ad.getTime() - bd.getTime();
        else if (ad && !bd) cmp = -1;
        else if (!ad && bd) cmp = 1;
        else cmp = 0;
      } else if (sortKey === "plant") {
        cmp = normalizeStr(a.plant).localeCompare(normalizeStr(b.plant));
      } else if (sortKey === "location") {
        cmp = normalizeStr(a.location).localeCompare(normalizeStr(b.location));
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [uiReminders, filters, sortKey, sortDir, plantOptions]);

  // ➕ Determine if any filter is active (to show "Clear filter" action)
  const isFilterActive = useMemo(() => {
    return Boolean(
      filters.plantId ||
      filters.location ||
      (filters.types && filters.types.length > 0) ||
      (filters.dueFrom && filters.dueFrom.trim()) ||
      (filters.dueTo && filters.dueTo.trim())
    );
  }, [filters]);

  const showFAB = !editOpen && !confirmDeleteReminderId && !sortOpen && !filterOpen;

  const showInitialSpinner = !hasLoadedOnce && loading;

  // ---------- ✨ ENTRANCE ANIMATION (staggered fade/translate for list items) ----------
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
    // Only animate list view after loading completes
    if (loading || viewMode !== "list") return;
    const ids = derivedReminders.map((r) => r.id);
    primeAnimations(ids);
    const raf = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, viewMode, derivedReminders.length]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <GlassHeader
        title="Reminders"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {/* Initial page-load spinner (centered, shared UI) */}
      {showInitialSpinner ? <CenteredSpinner size={56} color="#FFFFFF" /> : null}

      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      {!showInitialSpinner && (viewMode === "list" ? (
        <Animated.FlatList
          data={derivedReminders}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => {
            const v = getAnimForId(item.id);
            const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
            const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
            const opacity = v;

            return (
              <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
                <ReminderTile
                  reminder={item}
                  isMenuOpen={menuOpenId === item.id}
                  onToggleMenu={() => onToggleMenu(item.id)}
                  onPressBody={() => {}}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => askDelete(item)}
                />
              </Animated.View>
            );
          }}
          ListHeaderComponent={<View style={{ height: 0 }} />}
          ListFooterComponent={<View style={{ height: 140 }} />}
          contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setMenuOpenId(null)}
          // Use the dedicated refreshing state/handler so top spinner doesn't appear on first load
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
          ListEmptyComponent={
            !loading ? (
              <View style={s.emptyWrap}>
                {/* Single glass frame — no duplicate borders/backgrounds */}
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
                    {/* Centered header (icon + title) */}
                    <MaterialCommunityIcons
                      name="bell-outline"
                      size={26}
                      color="#FFFFFF"
                      style={{ marginBottom: 10 }}
                    />
                    <Text style={s.emptyTitle}>No reminders yet</Text>

                    {/* Left-aligned description */}
                    <View style={s.emptyDescBox}>
                      <Text style={s.emptyText}>
                        Reminders are associated with specific plants. Please make sure you have at least one plant created first.{"\n\n"}
                        Tap the <Text style={s.inlineBold}>“+” button</Text> to add a reminder. You’ll use a simple modal to pick the plant, choose the type (watering, moisture, fertilising, care, or repot), set the first due date, and define how often it should repeat.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      ) : (
        <RemindersCalendar
          reminders={derivedReminders}
          selectedDate={selectedDate}
          onSelectDate={(iso) => {
            setSelectedDate(iso);
            setMenuOpenId(null);
          }}
          menuOpenId={menuOpenId}
          onToggleMenu={(id) => setMenuOpenId((curr) => (curr === id || id === "" ? null : id))}
          onEdit={openEditModal}
          onDelete={askDelete}
        />
      ))}

      {showFAB && (
        <FAB
          actions={[
            { key: "add", label: "Add reminder", icon: "plus", onPress: openAddReminder },
            { key: "list", label: "List", icon: "view-list", onPress: openList },
            { key: "calendar", label: "Calendar", icon: "calendar-month", onPress: openCalendar },
            { key: "sort", label: "Sort", onPress: () => setSortOpen(true) , icon: "sort" },
            { key: "filter", label: "Filter", onPress: () => setFilterOpen(true), icon: "filter-variant" },
            // "Clear filter" directly beneath "Filter"; only visible when any filter is active
            ...(isFilterActive
              ? [
                  {
                    key: "clearFilter",
                    label: "Clear filter",
                    icon: "filter-remove",
                    onPress: () => setFilters(INITIAL_FILTERS),
                  } as const,
                ]
              : []),
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
        mode={editingId === null ? "create" : "edit"}
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

      <SortRemindersModal
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
          setSortKey("dueDate");
          setSortDir("asc");
          setSortOpen(false);
        }}
      />

      <FilterRemindersModal
        visible={filterOpen}
        plants={plantOptions}
        locations={locationOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
        onClearAll={() => {
          setFilters(INITIAL_FILTERS);
        }}
      />

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
