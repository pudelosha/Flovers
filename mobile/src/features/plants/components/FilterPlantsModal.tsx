import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/plants.styles";

type Props = {
  visible: boolean;
  locations: string[];
  latins: string[]; // plant “types” by latin name
  filters: { location?: string; latin?: string };
  onCancel: () => void;
  onApply: (filters: { location?: string; latin?: string }) => void;
  onClearAll: () => void;
};

export default function FilterPlantsModal({
  visible,
  locations,
  latins,
  filters,
  onCancel,
  onApply,
  onClearAll,
}: Props) {
  const [locOpen, setLocOpen] = React.useState(false);
  const [latinOpen, setLatinOpen] = React.useState(false);

  const [location, setLocation] = React.useState<string | undefined>(filters.location);
  const [latin, setLatin] = React.useState<string | undefined>(filters.latin);

  React.useEffect(() => {
    if (visible) {
      setLocOpen(false);
      setLatinOpen(false);
      setLocation(filters.location);
      setLatin(filters.latin);
    }
  }, [visible, filters]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Filter plants</Text>

          {/* Location */}
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setLatinOpen(false);
                setLocOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{location || "Any location"}</Text>
              <MaterialCommunityIcons name={locOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {locOpen && (
              <View style={s.dropdownList}>
                <Pressable
                  key="__any_location"
                  style={s.dropdownItem}
                  onPress={() => { setLocation(undefined); setLocOpen(false); }}
                >
                  <Text style={s.dropdownItemText}>Any location</Text>
                  {!location && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                </Pressable>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    style={s.dropdownItem}
                    onPress={() => { setLocation(loc); setLocOpen(false); }}
                  >
                    <Text style={s.dropdownItemText}>{loc}</Text>
                    {location === loc && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Latin (type) */}
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setLocOpen(false);
                setLatinOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{latin || "Any type (Latin name)"}</Text>
              <MaterialCommunityIcons name={latinOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {latinOpen && (
              <View style={s.dropdownList}>
                <Pressable
                  key="__any_type"
                  style={s.dropdownItem}
                  onPress={() => { setLatin(undefined); setLatinOpen(false); }}
                >
                  <Text style={s.dropdownItemText}>Any type</Text>
                  {!latin && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                </Pressable>
                {latins.map((ln) => (
                  <Pressable
                    key={ln}
                    style={s.dropdownItem}
                    onPress={() => { setLatin(ln); setLatinOpen(false); }}
                  >
                    <Text style={s.dropdownItemText}>{ln}</Text>
                    {latin === ln && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable onPress={onClearAll} style={s.promptBtn}>
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply({ location, latin })}
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
