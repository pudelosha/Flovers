import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Reuse Reminders modal look & feel
import { s } from "../../reminders/styles/reminders.styles";

type Status = "enabled" | "disabled";
type PlantOption = { id: string; name: string };

type Filters = {
  plantId?: string;     // exact match via dropdown
  location?: string;    // exact match via dropdown
  status?: Status;      // exact match via dropdown
};

type Props = {
  visible: boolean;
  plants: PlantOption[];
  locations: string[];
  filters: Filters;
  onCancel: () => void;
  onApply: (filters: Filters) => void;
  onClearAll: () => void;
};

export default function FilterReadingsModal({
  visible,
  plants,
  locations,
  filters,
  onCancel,
  onApply,
  onClearAll,
}: Props) {
  const [plantOpen, setPlantOpen] = React.useState(false);
  const [locOpen, setLocOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);

  const [plantId, setPlantId] = React.useState<string | undefined>(filters.plantId);
  const [location, setLocation] = React.useState<string | undefined>(filters.location);
  const [status, setStatus] = React.useState<Status | undefined>(filters.status);

  React.useEffect(() => {
    if (visible) {
      setPlantOpen(false);
      setLocOpen(false);
      setStatusOpen(false);
      setPlantId(filters.plantId);
      setLocation(filters.location);
      setStatus(filters.status);
    }
  }, [visible, filters]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
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

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Filter readings</Text>

          {/* Plant dropdown */}
          <Text style={s.inputLabel}>Plant</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setLocOpen(false);
                setStatusOpen(false);
                setPlantOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {plantId ? (plants.find((p) => p.id === plantId)?.name || "Select plant") : "Any plant"}
              </Text>
              <MaterialCommunityIcons name={plantOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {plantOpen && (
              <View style={s.dropdownList}>
                <Pressable
                  key="__any_plant"
                  style={s.dropdownItem}
                  onPress={() => {
                    setPlantId(undefined);
                    setPlantOpen(false);
                  }}
                >
                  <Text style={s.dropdownItemText}>Any plant</Text>
                  {!plantId && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                </Pressable>
                {plants.map((p) => (
                  <Pressable
                    key={p.id}
                    style={s.dropdownItem}
                    onPress={() => {
                      setPlantId(p.id);
                      setPlantOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{p.name}</Text>
                    {plantId === p.id && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Location dropdown */}
          <Text style={s.inputLabel}>Location</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setPlantOpen(false);
                setStatusOpen(false);
                setLocOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{location ? location : "Any location"}</Text>
              <MaterialCommunityIcons name={locOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {locOpen && (
              <View style={s.dropdownList}>
                <Pressable
                  key="__any_location"
                  style={s.dropdownItem}
                  onPress={() => {
                    setLocation(undefined);
                    setLocOpen(false);
                  }}
                >
                  <Text style={s.dropdownItemText}>Any location</Text>
                  {!location && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                </Pressable>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    style={s.dropdownItem}
                    onPress={() => {
                      setLocation(loc);
                      setLocOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{loc}</Text>
                    {location === loc && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Status dropdown */}
          <Text style={s.inputLabel}>Status</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setPlantOpen(false);
                setLocOpen(false);
                setStatusOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {status === "enabled" ? "Enabled" : status === "disabled" ? "Disabled" : "Any status"}
              </Text>
              <MaterialCommunityIcons name={statusOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {statusOpen && (
              <View style={s.dropdownList}>
                {[
                  { key: undefined, label: "Any status" },
                  { key: "enabled", label: "Enabled" },
                  { key: "disabled", label: "Disabled" },
                ].map((opt) => (
                  <Pressable
                    key={`${opt.key ?? "any"}`}
                    style={s.dropdownItem}
                    onPress={() => {
                      setStatus(opt.key as Status | undefined);
                      setStatusOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt.label}</Text>
                    {status === opt.key && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                    {opt.key === undefined && status === undefined && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable
              onPress={onClearAll}
              style={[s.promptBtn, { backgroundColor: "rgba(255,107,107,0.22)" }]}
            >
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                onApply({
                  plantId,
                  location,
                  status,
                })
              }
              style={[s.promptBtn, s.promptPrimary]}
            >
              <Text style={s.promptPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
