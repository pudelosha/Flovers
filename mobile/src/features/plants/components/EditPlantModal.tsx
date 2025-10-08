import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Keyboard } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/plants.styles";

type Props = {
  visible: boolean;
  latinCatalog: string[];
  locations: string[];

  fName: string;
  setFName: (v: string) => void;

  fLatinQuery: string;
  setFLatinQuery: (v: string) => void;
  fLatinSelected?: string;
  setFLatinSelected: (v?: string) => void;

  fLocation?: string;
  setFLocation: (v?: string) => void;

  fNotes: string;
  setFNotes: (v: string) => void;

  onCancel: () => void;
  onSave: () => void;
};

export default function EditPlantModal(props: Props) {
  const {
    visible,
    latinCatalog,
    locations,
    fName,
    setFName,
    fLatinQuery,
    setFLatinQuery,
    fLatinSelected,
    setFLatinSelected,
    fLocation,
    setFLocation,
    fNotes,
    setFNotes,
    onCancel,
    onSave,
  } = props;

  const [showLatin, setShowLatin] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = fLatinQuery.trim().toLowerCase();
    if (!q) return [];
    return latinCatalog
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 6);
  }, [latinCatalog, fLatinQuery]);

  if (!visible) return null;

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />
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
          <Text style={s.promptTitle}>Edit plant</Text>

          {/* Name */}
          <TextInput
            style={s.input}
            placeholder="Plant name (required)"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={fName}
            onChangeText={setFName}
          />

          {/* Latin live search */}
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
            {showLatin && suggestions.length > 0 && (
              <View style={s.suggestBox}>
                {suggestions.map((latin) => (
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

          {/* Location dropdown */}
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setShowLatin(false);
                setLocOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{fLocation || "Select location (optional)"} </Text>
              <MaterialCommunityIcons
                name={locOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
            {locOpen && (
              <View style={s.dropdownList}>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    style={s.dropdownItem}
                    onPress={() => {
                      setFLocation(loc);
                      setLocOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{loc}</Text>
                    {fLocation === loc && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
                <Pressable
                  style={s.dropdownItem}
                  onPress={() => {
                    setFLocation(undefined);
                    setLocOpen(false);
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
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.promptBtn, s.promptPrimary, !fName.trim() && { opacity: 0.5 }]}
              disabled={!fName.trim()}
              onPress={onSave}
            >
              <Text style={[s.promptBtnText, s.promptPrimaryText]}>Update</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
