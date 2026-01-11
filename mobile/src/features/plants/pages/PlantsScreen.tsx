import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
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
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { s } from "../styles/plants.styles";
import PlantTile from "../components/PlantTile";
import EditPlantModal from "../components/modals/EditPlantModal";
import ConfirmDeleteModal from "../components/modals/ConfirmDeleteModal";
import PlantQrModal from "../components/modals/PlantQrModal";
import PlantJournalModal from "../components/modals/PlantJournalModal";

import SortPlantsModal, {
  SortDir,
  SortKey,
} from "../components/modals/SortPlantsModal";
import FilterPlantsModal from "../components/modals/FilterPlantsModal";

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

type LightLevel5 =
  | "very-low"
  | "low"
  | "medium"
  | "bright-indirect"
  | "bright-direct";

function mapApiToPlant(
  item: ApiPlantInstanceListItem,
  unnamedFallback: string
): Plant {
  const name =
    item.display_name?.trim() ||
    item.plant_definition?.name?.trim() ||
    unnamedFallback;

  const latin = item.plant_definition?.latin || undefined;
  const location = item.location?.name || undefined;

  const imageUrl =
    item.plant_definition?.image_thumb ||
    item.plant_definition?.image ||
    undefined;

  return {
    id: String(item.id),
    name,
    latin,
    location,
    notes: item.notes || "",
    imageUrl,
    qrCode: item.qr_code ?? undefined,
  };
}

function norm(v?: string) {
  return (v || "").toLowerCase().trim();
}

export default function PlantsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // TOAST
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

  // EDIT MODAL
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(
    undefined
  );
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  const [fPurchaseDateISO, setFPurchaseDateISO] = useState<
    string | null | undefined
  >(null);
  const [fLightLevel, setFLightLevel] = useState<LightLevel5>("medium");
  const [fOrientation, setFOrientation] = useState<"N" | "E" | "S" | "W">("S");
  const [fDistanceCm, setFDistanceCm] = useState<number>(0);
  const [fPotMaterial, setFPotMaterial] = useState<string | undefined>(
    undefined
  );
  const [fSoilMix, setFSoilMix] = useState<string | undefined>(undefined);

  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // SORT / FILTER
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("plant");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<{ location?: string; latin?: string }>(
    {}
  );

  // QR MODAL
  const [qrVisible, setQrVisible] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [qrPlantName, setQrPlantName] = useState("");

  // JOURNAL MODAL
  const [journalVisible, setJournalVisible] = useState(false);
  const [journalPlantName, setJournalPlantName] = useState("");
  const [journalPlantId, setJournalPlantId] = useState<string>("");

  // Hide modals/menus on focus
  useFocusEffect(
    useCallback(() => {
      setEditOpen(false);
      setEditingId(null);
      setMenuOpenId(null);
      setQrVisible(false);

      // also reset journal
      setJournalVisible(false);
      setJournalPlantName("");
      setJournalPlantId("");

      return undefined;
    }, [])
  );

  const unnamedFallback = useMemo(
    () => t("plants.list.unnamed", { defaultValue: "Unnamed plant" }),
    [t, currentLanguage]
  );

  // MAIN LOAD
  const load = useCallback(async () => {
    try {
      const data = await fetchPlantInstances({ auth: true });
      setPlants(data.map((it) => mapApiToPlant(it, unnamedFallback)));
    } catch (e: any) {
      showToast(
        e?.message ||
          t("plants.toast.loadFailed", {
            defaultValue: "Failed to load plants",
          }),
        "error"
      );
      setPlants([]);
    }
  }, [t, currentLanguage, unnamedFallback]);

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
    nav.navigate("CreatePlantWizard");
  };

  // Journal open
  const openJournal = (p: Plant) => {
    setMenuOpenId(null);
    setJournalPlantId(p.id);
    setJournalPlantName(p.name);
    setJournalVisible(true);
  };

  // ✅ EDIT MODAL open (stabilized to avoid focus-effect loop)
  const openEditModal = useCallback(
    async (p: Plant) => {
      setMenuOpenId(null);
      setEditingId(p.id);
      setEditLoading(true);

      try {
        setFName(p.name);
        setFLatinQuery(p.latin || "");
        setFLatinSelected(p.latin);
        setFLocation(p.location);
        setFNotes(p.notes || "");

        const detail = await fetchPlantInstanceForEdit(Number(p.id), {
          auth: true,
        });

        if (detail.display_name !== undefined && detail.display_name !== null)
          setFName(detail.display_name || "");
        if (detail.notes !== undefined && detail.notes !== null)
          setFNotes(detail.notes || "");
        setFPurchaseDateISO(
          detail.purchase_date === undefined ? null : detail.purchase_date
        );

        setFLightLevel((detail.light_level as LightLevel5) || "medium");
        setFOrientation((detail.orientation as any) || "S");
        setFDistanceCm(detail.distance_cm ?? 0);

        setFPotMaterial(detail.pot_material ?? undefined);
        setFSoilMix(detail.soil_mix ?? undefined);

        setFLatinQuery(detail.plant_definition?.name || p.latin || "");
        setFLatinSelected(detail.plant_definition?.name || p.latin || undefined);
        setFLocation(detail.location?.name || p.location);

        setEditOpen(true);
      } catch (e: any) {
        Alert.alert(
          t("plants.alert.loadFailedTitle", { defaultValue: "Load failed" }),
          e?.message ||
            t("plants.alert.loadFailedMsg", {
              defaultValue: "Could not load plant details.",
            })
        );
      } finally {
        setEditLoading(false);
      }
    },
    [t]
  );

  // ✅ helper: open edit modal by id without loading tiles
  const openEditModalById = useCallback(
    async (id: string) => {
      const stub: Plant = {
        id: String(id),
        name: "",
        latin: undefined,
        location: undefined,
        notes: "",
        imageUrl: undefined,
        qrCode: undefined,
      };
      await openEditModal(stub);
    },
    [openEditModal]
  );

  // ✅ Focus load: if editPlantId is provided => show spinner only + open modal, skip tiles load
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        const params = (route as any)?.params;
        const incomingEditId =
          params?.editPlantId ?? params?.plantId ?? params?.id;

        if (incomingEditId) {
          (nav as any).setParams?.({
            editPlantId: undefined,
            plantId: undefined,
            id: undefined,
          });

          if (!mounted) return;

          setLoading(true);
          setPlants([]); // ensure no tiles flash

          try {
            await openEditModalById(String(incomingEditId));
          } finally {
            if (mounted) setLoading(false);
          }

          return;
        }

        // Original behavior
        setLoading(true);
        setPlants([]); // avoid stale flash
        try {
          await load();
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [load, route, nav, openEditModalById])
  );

  const closeEdit = () => setEditOpen(false);

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

      const updatedListItem = await updatePlantInstanceFromForm(
        Number(editingId),
        form,
        { auth: true }
      );

      setPlants((prev) =>
        prev.map((p) =>
          p.id === editingId ? mapApiToPlant(updatedListItem, unnamedFallback) : p
        )
      );

      closeEdit();
      showToast(
        t("plants.toast.updated", { defaultValue: "Plant updated" }),
        "success"
      );
    } catch (e: any) {
      Alert.alert(
        t("plants.alert.updateFailedTitle", { defaultValue: "Update failed" }),
        e?.message ||
          t("plants.alert.updateFailedMsg", {
            defaultValue: "Could not update this plant.",
          })
      );
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

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
      showToast(
        t("plants.toast.deleted", { defaultValue: "Plant deleted" }),
        "success"
      );
    } catch (e: any) {
      Alert.alert(
        t("plants.alert.deleteFailedTitle", { defaultValue: "Delete failed" }),
        e?.message ||
          t("plants.alert.deleteFailedMsg", {
            defaultValue: "Could not delete this plant.",
          })
      );
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName("");
    }
  };

  // QR modal open
  const openShowQr = (p: Plant) => {
    setMenuOpenId(null);

    const code = p.qrCode || p.id; // fallback if missing
    const value = `https://flovers.app/api/plant-instances/by-qr/?code=${encodeURIComponent(
      code
    )}`;

    setQrPlantName(p.name);
    setQrValue(value);
    setQrVisible(true);
  };

  // dropdown options
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

  // filters + sort
  const derivedPlants = useMemo(() => {
    const filtered = plants.filter((p) => {
      if (filters.location && norm(p.location) !== norm(filters.location))
        return false;
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

  const isFilterActive = useMemo(
    () => Boolean(filters.location || filters.latin),
    [filters.location, filters.latin]
  );

  const showFAB =
    !editOpen &&
    !confirmDeleteId &&
    !sortOpen &&
    !filterOpen &&
    !qrVisible &&
    !journalVisible;

  // animations for tiles
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
    const ids = derivedPlants.map((p) => p.id);
    primeAnimations(ids);
    const id = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, derivedPlants.length]);

  // empty-state animation
  const emptyAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }
    if (derivedPlants.length === 0) {
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
  }, [loading, derivedPlants.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  // skeleton
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={t("plants.header.title", { defaultValue: "Plants" })}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate("Scanner")}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t("plants.header.title", { defaultValue: "Plants" })}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner")}
        showSeparator={false}
      />

      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />
      )}

      <Animated.FlatList
        style={{ flex: 1 }}
        data={derivedPlants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          });
          const scale = v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          });
          const opacity = v;

          const isOpen = menuOpenId === item.id;

          return (
            <Animated.View
              style={[
                { opacity, transform: [{ translateY }, { scale }] },
                isOpen && { zIndex: 50, elevation: 50 },
              ]}
            >
              <PlantTile
                plant={item}
                isMenuOpen={isOpen}
                onPressBody={() => nav.navigate("PlantDetails", { id: item.id })}
                onPressMenu={() =>
                  setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                }
                onEdit={() => openEditModal(item)}
                onReminders={() =>
                  nav.navigate("Reminders", {
                    plantId: item.id,
                    plantName: item.name,
                  })
                }
                onJournal={() => openJournal(item)}
                onDelete={() => askDelete(item)}
                onShowQr={() => openShowQr(item)}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
              <View pointerEvents="none" style={s.emptyTint} />
              <View pointerEvents="none" style={s.emptyBorder} />

              <View style={s.emptyInner}>
                <MaterialCommunityIcons
                  name="sprout-outline"
                  size={26}
                  color="#FFFFFF"
                  style={{ marginBottom: 10 }}
                />
                <Text style={s.emptyTitle}>
                  {t("plants.empty.title", { defaultValue: "No plants yet" })}
                </Text>
                <View style={s.emptyDescBox}>
                  <Text style={s.emptyText}>
                    {t("plants.empty.desc1", {
                      defaultValue:
                        'Tap the “+” button in the bottom-right corner to add your first plant.',
                    })}{" "}
                    {t("plants.empty.desc2", {
                      defaultValue:
                        "The Create Plant Wizard will help you set up your plant and specify its parameters, as well as schedule reminders.",
                    })}
                    {"\n\n"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      />

      {/* FAB */}
      {showFAB && (
        <View
          onStartShouldSetResponderCapture={() => {
            setMenuOpenId(null);
            return false;
          }}
        >
          <FAB
            bottomOffset={92}
            position={settings.fabPosition}
            actions={[
              {
                key: "create",
                icon: "plus",
                label: t("plants.fab.create", { defaultValue: "Create plant" }),
                onPress: openCreatePlantWizard,
              },
              {
                key: "sort",
                icon: "sort",
                label: t("plants.fab.sort", { defaultValue: "Sort" }),
                onPress: () => setSortOpen(true),
              },
              {
                key: "filter",
                icon: "filter-variant",
                label: t("plants.fab.filter", { defaultValue: "Filter" }),
                onPress: () => setFilterOpen(true),
              },
              ...(isFilterActive
                ? [
                    {
                      key: "clearFilter",
                      label: t("plants.fab.clearFilter", {
                        defaultValue: "Clear filter",
                      }),
                      icon: "filter-remove",
                      onPress: () => setFilters({}),
                    } as const,
                  ]
                : []),
              {
                key: "locations",
                icon: "map-marker-outline",
                label: t("plants.fab.locations", {
                  defaultValue: "Locations",
                }),
                onPress: () => {
                  setMenuOpenId(null);
                  nav.navigate("PlantLocations");
                },
              },
            ]}
          />
        </View>
      )}

      {/* Modals */}
      <EditPlantModal
        visible={editOpen}
        latinCatalog={latinOptions}
        locations={locationOptions}
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
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <CenteredSpinner size={46} color="#FFFFFF" />
        </View>
      )}

      <PlantQrModal
        visible={qrVisible}
        plantName={qrPlantName}
        qrValue={qrValue}
        onClose={() => setQrVisible(false)}
        onPressSave={() => {
          showToast(
            t("plants.toast.qrSaved", {
              defaultValue: "QR code saved to your gallery.",
            }),
            "default"
          );
        }}
        onPressEmail={() => {
          showToast(
            t("plants.toast.qrEmailed", {
              defaultValue:
                "An email with this QR code will be sent to your account address.",
            }),
            "default"
          );
        }}
      />

      {/* Journal modal render */}
      <PlantJournalModal
        visible={journalVisible}
        plantId={journalPlantId}
        plantName={journalPlantName}
        onClose={() => {
          setJournalVisible(false);
          setJournalPlantName("");
          setJournalPlantId("");
        }}
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
