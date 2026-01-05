import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { s } from "../../styles/plants.styles";

type Props = {
  visible: boolean;
  locations: string[];
  latinOptions: string[];
  filters: { location?: string; latin?: string };
  onCancel: () => void;
  onApply: (filters: { location?: string; latin?: string }) => void;
  onClearAll: () => void;
};

export default function FilterPlantsModal({
  visible,
  locations,
  latinOptions,
  filters,
  onCancel,
  onApply,
  onClearAll,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {tr("plantsModals.filter.title", "Filter plants")}
          </Text>

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
              <Text style={s.dropdownValue}>
                {location || tr("plantsModals.filter.anyLocation", "Any location")}
              </Text>
              <MaterialCommunityIcons
                name={locOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
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
                  <Text style={s.dropdownItemText}>
                    {tr("plantsModals.filter.anyLocation", "Any location")}
                  </Text>
                  {!location && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  )}
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
                    {location === loc && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
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
              <Text style={s.dropdownValue}>
                {latin || tr("plantsModals.filter.anyLatin", "Any latin/type")}
              </Text>
              <MaterialCommunityIcons
                name={latinOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {latinOpen && (
              <View style={s.dropdownList}>
                <Pressable
                  key="__any_latin"
                  style={s.dropdownItem}
                  onPress={() => {
                    setLatin(undefined);
                    setLatinOpen(false);
                  }}
                >
                  <Text style={s.dropdownItemText}>
                    {tr("plantsModals.filter.anyLatin", "Any latin/type")}
                  </Text>
                  {!latin && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  )}
                </Pressable>

                {latinOptions.map((ln) => (
                  <Pressable
                    key={ln}
                    style={s.dropdownItem}
                    onPress={() => {
                      setLatin(ln);
                      setLatinOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{ln}</Text>
                    {latin === ln && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable onPress={onClearAll} style={[s.promptBtn, s.promptDanger]}>
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                {tr("plantsModals.common.clear", "Clear")}
              </Text>
            </Pressable>

            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>
                {tr("plantsModals.common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onApply({ location, latin })}
              style={[s.promptBtn, s.promptPrimary]}
            >
              <Text style={s.promptPrimaryText}>
                {tr("plantsModals.common.apply", "Apply")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
