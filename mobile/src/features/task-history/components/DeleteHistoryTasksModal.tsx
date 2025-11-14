import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/task-history.styles";
import type { TaskType } from "../../home/types/home.types";
import { ACCENT_BY_TYPE } from "../../home/constants/home.constants";

export type HistoryDeleteMode = "plant" | "location" | "types" | "olderThan";

export type HistoryDeletePayload =
  | { mode: "plant"; plantId: string }
  | { mode: "location"; location: string }
  | { mode: "types"; types: TaskType[] }
  | { mode: "olderThan"; days: number };

type PlantOption = { id: string; name: string };

type Props = {
  visible: boolean;
  plantOptions: PlantOption[];
  locationOptions: string[];
  onCancel: () => void;
  onConfirm: (payload: HistoryDeletePayload) => void;
};

const DAYS_OPTIONS = [30, 60, 180];
const TYPE_OPTIONS: TaskType[] = ["watering", "moisture", "fertilising", "care", "repot"];

// same helper as in filters
function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(255,255,255,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function DeleteHistoryTasksModal({
  visible,
  plantOptions,
  locationOptions,
  onCancel,
  onConfirm,
}: Props) {
  const [mode, setMode] = React.useState<HistoryDeleteMode>("plant");

  const [plantDropdownOpen, setPlantDropdownOpen] = React.useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = React.useState(false);
  const [daysOpen, setDaysOpen] = React.useState(false);

  const [selectedPlantId, setSelectedPlantId] = React.useState<string | undefined>();
  const [selectedLocation, setSelectedLocation] = React.useState<string | undefined>();
  const [selectedTypes, setSelectedTypes] = React.useState<TaskType[]>([]);
  const [days, setDays] = React.useState<number>(30);

  React.useEffect(() => {
    if (visible) {
      // default to first option: delete for selected plant
      setMode("plant");
      setDays(30);
      setDaysOpen(false);
      setPlantDropdownOpen(false);
      setLocationDropdownOpen(false);
      setSelectedPlantId(undefined);
      setSelectedLocation(undefined);
      setSelectedTypes([]);
    }
  }, [visible]);

  if (!visible) return null;

  const hasPlantScope = plantOptions.length > 0;
  const hasLocationScope = locationOptions.length > 0;

  const toggleType = (t: TaskType) => {
    setSelectedTypes((curr) =>
      curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]
    );
  };

  const canConfirm =
    (mode === "olderThan") ||
    (mode === "plant" && !!selectedPlantId) ||
    (mode === "location" && !!selectedLocation) ||
    (mode === "types" && selectedTypes.length > 0);

  const handleConfirm = () => {
    if (!canConfirm) return;

    if (mode === "olderThan") {
      onConfirm({ mode: "olderThan", days });
    } else if (mode === "plant" && selectedPlantId) {
      onConfirm({ mode: "plant", plantId: selectedPlantId });
    } else if (mode === "location" && selectedLocation) {
      onConfirm({ mode: "location", location: selectedLocation });
    } else if (mode === "types" && selectedTypes.length > 0) {
      onConfirm({ mode: "types", types: selectedTypes });
    }
  };

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

      <View style={s.promptWrap}>
        <View style={[s.promptGlass, s.promptGlass28]}>
          <BlurView
            // @ts-ignore
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={[s.promptInner, s.promptInner28]}>
          <Text style={s.promptTitle}>Delete history</Text>

          <Text style={s.inputLabel}>Scope</Text>

          {/* Delete for selected plant */}
          <Pressable
            style={[s.radioRow, !hasPlantScope && styles.disabledRow]}
            disabled={!hasPlantScope}
            onPress={() => {
              if (!hasPlantScope) return;
              setMode("plant");
            }}
          >
            <View style={s.radioOuter}>
              {mode === "plant" && hasPlantScope && <View style={s.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emptyText}>Delete for selected plant</Text>
              {!hasPlantScope && (
                <Text style={styles.helperText}>
                  You don't have any plants in history yet.
                </Text>
              )}
            </View>
          </Pressable>

          {mode === "plant" && hasPlantScope && (
            <View style={[s.dropdown, { marginTop: 4 }]}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => setPlantDropdownOpen((o) => !o)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>
                  {selectedPlantId
                    ? plantOptions.find((p) => p.id === selectedPlantId)?.name ||
                      "Select plant"
                    : "Select plant"}
                </Text>
                <MaterialCommunityIcons
                  name={plantDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {plantDropdownOpen && (
                <View style={s.dropdownList}>
                  {plantOptions.map((p) => (
                    <Pressable
                      key={p.id}
                      style={s.dropdownItem}
                      onPress={() => {
                        setSelectedPlantId(p.id);
                        setPlantDropdownOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{p.name}</Text>
                      {selectedPlantId === p.id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Delete for selected location */}
          <Pressable
            style={[s.radioRow, !hasLocationScope && styles.disabledRow]}
            disabled={!hasLocationScope}
            onPress={() => {
              if (!hasLocationScope) return;
              setMode("location");
            }}
          >
            <View style={s.radioOuter}>
              {mode === "location" && hasLocationScope && <View style={s.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emptyText}>Delete for selected location</Text>
              {!hasLocationScope && (
                <Text style={styles.helperText}>
                  You don't have any locations in history yet.
                </Text>
              )}
            </View>
          </Pressable>

          {mode === "location" && hasLocationScope && (
            <View style={[s.dropdown, { marginTop: 4 }]}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => setLocationDropdownOpen((o) => !o)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>
                  {selectedLocation || "Select location"}
                </Text>
                <MaterialCommunityIcons
                  name={locationDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {locationDropdownOpen && (
                <View style={s.dropdownList}>
                  {locationOptions.map((loc) => (
                    <Pressable
                      key={loc}
                      style={s.dropdownItem}
                      onPress={() => {
                        setSelectedLocation(loc);
                        setLocationDropdownOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{loc}</Text>
                      {selectedLocation === loc && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Delete tasks of particular type(s) */}
          <Pressable
            style={s.radioRow}
            onPress={() => setMode("types")}
          >
            <View style={s.radioOuter}>
              {mode === "types" && <View style={s.radioInner} />}
            </View>
            <Text style={s.emptyText}>Delete tasks of type</Text>
          </Pressable>

          {mode === "types" && (
            <View style={[s.chipRow, { marginTop: 4 }]}>
              {TYPE_OPTIONS.map((t) => {
                const selected = selectedTypes.includes(t);
                const tint = ACCENT_BY_TYPE[t];
                return (
                  <Pressable
                    key={t}
                    onPress={() => toggleType(t)}
                    style={[
                      s.chip,
                      {
                        backgroundColor: selected
                          ? hexToRgba(tint, 0.22)
                          : "rgba(255,255,255,0.12)",
                      },
                    ]}
                  >
                    <Text style={s.chipText}>{t.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Delete older than */}
          <Pressable
            style={s.radioRow}
            onPress={() => setMode("olderThan")}
          >
            <View style={s.radioOuter}>
              {mode === "olderThan" && <View style={s.radioInner} />}
            </View>
            <Text style={s.emptyText}>Delete tasks older than</Text>
          </Pressable>

          {/* Days dropdown – only when "olderThan" is active */}
          {mode === "olderThan" && (
            <View style={[s.dropdown, { marginTop: 8 }]}>
              <Pressable
                style={[s.dropdownHeader, styles.ddHeaderFlat]}
                onPress={() => setDaysOpen((o) => !o)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>{days} days</Text>
                <MaterialCommunityIcons
                  name={daysOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {daysOpen && (
                <View style={[s.dropdownList, styles.ddListFlat]}>
                  {DAYS_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[s.dropdownItem, styles.ddItemFlat]}
                      onPress={() => {
                        setDays(opt);
                        setDaysOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{opt} days</Text>
                      {days === opt && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={[s.promptButtonsRow, { marginTop: 18 }]}>
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                s.promptBtn,
                s.promptDanger,
                !canConfirm && { opacity: 0.5 },
              ]}
              disabled={!canConfirm}
            >
              <Text style={[s.promptPrimaryText, { color: "#FF6B6B", fontWeight: "800" }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ddHeaderFlat: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ddListFlat: {
    borderWidth: 0,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  ddItemFlat: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  helperText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  disabledRow: {
    opacity: 0.55,
  },
});
