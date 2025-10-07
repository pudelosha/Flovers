import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
  FlatList as RNFlatList,
  TextInput,
  Keyboard,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";

// Try to use react-native-linear-gradient if installed; otherwise fall back to a plain View
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

type Plant = {
  id: string;
  name: string;
  latin?: string;
  location?: string;
  notes?: string;
};

const TILE_BLUR = 8;

// Header: semi-transparent horizontal dark-green gradient (header ONLY)
const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// Simple latin-name catalog for suggestions (demo)
const LATIN_CATALOG = [
  "Monstera deliciosa",
  "Ficus lyrata",
  "Aloe vera",
  "Phalaenopsis aphrodite",
  "Dracaena fragrans",
  "Epipremnum aureum",
  "Sansevieria trifasciata",
  "Spathiphyllum wallisii",
  "Chlorophytum comosum",
  "Zamioculcas zamiifolia",
];

export default function PlantsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  // Dummy user locations (dropdown)
  const userLocations = ["Living Room", "Bedroom", "Kitchen", "Office", "Hallway"];

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

  // Modal: add/edit
  type Mode = "add" | "edit";
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(undefined);
  const [showLatin, setShowLatin] = useState(false);
  const [fLocationOpen, setFLocationOpen] = useState(false);
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  // Delete confirmation modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>("");

  // OPEN ADD FIRST, THEN CLOSE MENU (prevents action being lost during re-render)
  const openAddModal = () => {
    setMode("add");
    setEditingId(null);
    setFName("");
    setFLatinQuery("");
    setFLatinSelected(undefined);
    setFLocation(undefined);
    setFNotes("");
    setFLocationOpen(false);
    setShowLatin(false);
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
    setFLocationOpen(false);
    setShowLatin(false);
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFLocationOpen(false);
    setShowLatin(false);
  };

  const onSave = () => {
    if (!fName.trim()) return; // simple required check

    if (mode === "add") {
      const newPlant: Plant = {
        id: String(Date.now()),
        name: fName.trim(),
        latin: (fLatinSelected || fLatinQuery || "").trim() || undefined,
        location: fLocation,
        notes: fNotes.trim() || undefined,
      };
      setPlants((prev) => [newPlant, ...prev]);
    } else if (mode === "edit" && editingId) {
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
    }
    closeModal();
  };

  // OPEN CONFIRM DIALOG FIRST, THEN CLOSE MENU
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

  const renderPlant = ({ item }: ListRenderItemInfo<Plant>) => {
    const isMenuOpen = menuOpenId === item.id;

    return (
      <View style={s.cardWrap}>
        {/* Glass background (blur only, no color tint) */}
        <View style={s.cardGlass}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={TILE_BLUR}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
        </View>

        {/* Content row */}
        <View style={s.cardRow}>
          {/* Tappable body → PlantDetails */}
          <Pressable
            style={{ flex: 1, paddingRight: 8 }}
            onPress={() => nav.navigate("PlantDetails" as never)}
            android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          >
            <Text style={s.plantName} numberOfLines={1}>
              {item.name}
            </Text>
            {!!item.latin && (
              <Text style={s.latin} numberOfLines={1}>
                {item.latin}
              </Text>
            )}
            {!!item.location && (
              <Text style={s.location} numberOfLines={1}>
                {item.location}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
            style={s.menuBtn}
            android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Floating menu */}
        {isMenuOpen && (
          <View style={s.menuSheet} pointerEvents="auto">
            <MenuItem label="Edit" icon="pencil-outline" onPress={() => openEditModal(item)} />
            <MenuItem label="Show reminders" icon="bell-outline" onPress={() => { /* wire later */ }} />
            <MenuItem label="Delete" icon="trash-can-outline" danger onPress={() => askDelete(item)} />
          </View>
        )}
      </View>
    );
  };

  // Header bar with submenu: add, sort, filter, locations
  const HeaderStatic: React.FC = () => (
    <LinearGradientView
      colors={HEADER_GRADIENT_TINT}
      locations={[0, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[s.headerBar, { paddingTop: insets.top + 10, backgroundColor: HEADER_SOLID_FALLBACK }]}
    >
      <View style={s.headerTopRow}>
        <Text style={s.headerTitle}>Plants</Text>
        <Pressable
          onPress={() => nav.navigate("Scanner" as never)}
          style={s.scanBtn}
          android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={s.separator} />

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
    </LinearGradientView>
  );

  // latin suggestions (simple contains)
  const latinSuggestions =
    fLatinQuery.trim().length > 0
      ? LATIN_CATALOG.filter((n) => n.toLowerCase().includes(fLatinQuery.trim().toLowerCase())).slice(0, 6)
      : [];

  return (
    <View style={{ flex: 1 }}>
      <HeaderStatic />

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
      {modalOpen && (
        <>
          <Pressable
            style={s.promptBackdrop}
            onPress={() => {
              Keyboard.dismiss();
              closeModal();
            }}
          />
          <View style={s.promptWrap}>
            <View style={s.promptGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
            </View>

            <View style={s.promptInner}>
              <Text style={s.promptTitle}>{mode === "add" ? "Add plant" : "Edit plant"}</Text>

              {/* Plant name (required) */}
              <TextInput
                style={s.input}
                placeholder="Plant name (required)"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={fName}
                onChangeText={setFName}
              />

              {/* Latin name live search */}
              <View style={{ position: "relative" }}>
                <TextInput
                  style={s.input}
                  placeholder="Latin name (search)…"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={fLatinQuery}
                  onFocus={() => setShowLatin(true)}
                  onChangeText={(t) => {
                    setFLatinQuery(t);
                    setFLatinSelected(undefined);
                    setShowLatin(true);
                  }}
                />
                {showLatin && latinSuggestions.length > 0 && (
                  <View style={s.suggestBox}>
                    {latinSuggestions.map((latin) => (
                      <Pressable
                        key={latin}
                        style={s.suggestItem}
                        onPress={() => {
                          setFLatinQuery(latin);
                          setFLatinSelected(latin);
                          setShowLatin(false);
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={s.suggestText}>{latin}</Text>
                        {fLatinSelected === latin && (
                          <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Location dropdown (dummy list) */}
              <View style={s.dropdown}>
                <Pressable
                  style={s.dropdownHeader}
                  onPress={() => {
                    setShowLatin(false);
                    setFLocationOpen((o) => !o);
                  }}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                >
                  <Text style={s.dropdownValue}>{fLocation || "Select location (optional)"} </Text>
                  <MaterialCommunityIcons
                    name={fLocationOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>
                {fLocationOpen && (
                  <View style={s.dropdownList}>
                    {userLocations.map((loc) => (
                      <Pressable
                        key={loc}
                        style={s.dropdownItem}
                        onPress={() => {
                          setFLocation(loc);
                          setFLocationOpen(false);
                        }}
                      >
                        <Text style={s.dropdownItemText}>{loc}</Text>
                        {fLocation === loc && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                      </Pressable>
                    ))}
                    <Pressable
                      style={s.dropdownItem}
                      onPress={() => {
                        setFLocation(undefined);
                        setFLocationOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>— None —</Text>
                      {!fLocation && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Notes */}
              <TextInput
                style={[s.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
                placeholder="Notes… (optional)"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={fNotes}
                onChangeText={setFNotes}
                multiline
              />

              <View style={s.promptButtonsRow}>
                <Pressable style={s.promptBtn} onPress={closeModal}>
                  <Text style={s.promptBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.promptBtn, s.promptPrimary, !fName.trim() && { opacity: 0.5 }]}
                  disabled={!fName.trim()}
                  onPress={onSave}
                >
                  <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                    {mode === "add" ? "Save" : "Update"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeleteId && (
        <>
          <Pressable style={s.promptBackdrop} onPress={() => setConfirmDeleteId(null)} />
          <View style={s.promptWrap}>
            <View style={s.promptGlass}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
            </View>

            <View style={s.promptInner}>
              <Text style={s.promptTitle}>Delete plant</Text>
              <Text style={s.confirmText}>
                Are you sure you want to delete{" "}
                <Text style={{ fontWeight: "800", color: "#fff" }}>{confirmDeleteName}</Text>?
                This action cannot be undone.
              </Text>
              <View style={s.promptButtonsRow}>
                <Pressable style={s.promptBtn} onPress={() => setConfirmDeleteId(null)}>
                  <Text style={s.promptBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[s.promptBtn, s.promptDanger]} onPress={confirmDelete}>
                  <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // HEADER
  headerBar: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  // Submenu (4 columns)
  subRow4: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  subColLeft: { flex: 1, alignItems: "flex-start" },
  subColMidLeft: { flex: 1, alignItems: "center" },
  subColMidRight: { flex: 1, alignItems: "center" },
  subColRight: { flex: 1, alignItems: "flex-end" },
  subBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  subBtnInner: { flexDirection: "row", alignItems: "center" },
  subBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "lowercase",
  },
  subIcon: { marginLeft: 6 },

  // Backdrop to dismiss tile menus
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // IMPORTANT: keep this behind the FlatList so it doesn't block menu taps
    backgroundColor: "transparent",
  },

  // TILES
  cardWrap: {
    height: 96,
    borderRadius: 18,
    overflow: "visible",
    position: "relative",
  },
  cardGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cardRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18, // more left padding
    gap: 8,
  },
  plantName: { color: "#FFFFFF", fontWeight: "800", fontSize: 17 },
  latin: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  location: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginTop: 2 },

  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  // Floating menu (above tile)
  menuSheet: {
    position: "absolute",
    right: 6,
    top: -6,
    zIndex: 10,
    elevation: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  menuItemText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
    fontSize: 12,
  },

  // MODAL (Add/Edit)
  promptBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 20,
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
    paddingHorizontal: 24,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    overflow: "hidden",
  },
  promptInner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
  },
  promptTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  input: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  // Suggestions dropdown for latin name
  suggestBox: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.65)",
    zIndex: 30,
  },
  suggestItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  suggestText: { color: "#FFFFFF", fontWeight: "700" },

  // Dropdown (location)
  dropdown: { marginHorizontal: 16, marginBottom: 10 },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownValue: { color: "#FFFFFF", fontWeight: "800" },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dropdownItemText: { color: "#FFFFFF", fontWeight: "700" },

  // Modal buttons
  promptButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  promptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  promptBtnText: { color: "#FFFFFF", fontWeight: "800" },
  promptPrimary: {
    backgroundColor: "rgba(11,114,133,0.9)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  promptPrimaryText: { color: "#FFFFFF", fontWeight: "800" },

  // Delete confirm text
  confirmText: {
    color: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  // Danger button style
  promptDanger: {
    backgroundColor: "rgba(255,107,107,0.2)",
    borderColor: "rgba(255,107,107,0.45)",
  },
});
