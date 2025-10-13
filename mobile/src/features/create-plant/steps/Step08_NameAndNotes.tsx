// steps/Step08_NameAndNotes.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Platform, Alert } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

// Optional datetime picker (graceful fallback if not installed)
let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date | null {
  // Accept strict YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  // Basic sanity: month rollover & not future
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

export default function Step08_NameAndNotes() {
  const { state, actions } = useCreatePlantWizard();
  const [showPicker, setShowPicker] = useState(false);

  // Fallback modal state
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackDate, setFallbackDate] = useState(state.purchaseDateISO ?? "");

  // Autofill suggestion from selected plant
  const placeholderName = useMemo(() => {
    return state.displayName && state.displayName.length > 0
      ? undefined
      : state.selectedPlant?.name ?? "e.g. Living room Monstera";
  }, [state.displayName, state.selectedPlant?.name]);

  const onChangeDateNative = (_: any, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (date) {
      actions.setPurchaseDateISO(toISODate(date));
    }
  };

  const openPurchaseDate = () => {
    if (DateTimePicker) {
      setShowPicker(true);
    } else {
      // Fallback modal
      setFallbackDate(state.purchaseDateISO ?? "");
      setFallbackOpen(true);
    }
  };

  const onFallbackSave = () => {
    if (!fallbackDate) {
      actions.setPurchaseDateISO(undefined);
      setFallbackOpen(false);
      return;
    }
    const dt = parseISODate(fallbackDate.trim());
    if (!dt) {
      Alert.alert("Invalid date", "Please enter a valid date in the format YYYY-MM-DD.");
      return;
    }
    actions.setPurchaseDateISO(toISODate(dt));
    setFallbackOpen(false);
  };

  const onCreate = () => {
    // TODO: integrate backend creation + navigate to plant details screen
    actions.goNext();
  };

  return (
    <View style={wiz.cardWrap}>
      {/* glass layer */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.12)" } as any}
        />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Name & notes</Text>
        <Text style={wiz.subtitle}>
          Give your plant a display name, add any notes, and (optionally) set the purchase date so we can estimate its age.
        </Text>

        {/* Display name */}
        <Text style={wiz.sectionTitle}>Display name</Text>
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.6)"
          placeholder={placeholderName}
          value={state.displayName}
          onChangeText={actions.setDisplayName}
          style={wiz.inputField}
        />

        {/* Notes (multiline) */}
        <Text style={wiz.sectionTitle}>Notes</Text>
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.6)"
          placeholder="Care tips, issues, where you bought it…"
          value={state.notes}
          onChangeText={actions.setNotes}
          style={[wiz.inputField, { minHeight: 96, textAlignVertical: "top" }]}
          multiline
        />

        {/* Purchase date */}
        <Text style={wiz.sectionTitle}>Purchase date (optional)</Text>
        <Pressable style={wiz.selectField} onPress={openPurchaseDate}>
          <Text style={wiz.selectValue}>{state.purchaseDateISO ?? "Not set"}</Text>
          <View style={wiz.selectChevronPad}>
            <MaterialCommunityIcons name="calendar" size={20} color="#FFFFFF" />
          </View>
        </Pressable>

        {showPicker && DateTimePicker && (
          <View style={{ marginBottom: 10 }}>
            <DateTimePicker
              value={
                state.purchaseDateISO
                  ? new Date(state.purchaseDateISO + "T00:00:00")
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onChangeDateNative}
              maximumDate={new Date()}
            />
            {Platform.OS === "ios" && (
              <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
                <Pressable style={[wiz.btn, wiz.btnPrimary]} onPress={() => setShowPicker(false)}>
                  <Text style={wiz.btnText}>Done</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Fallback modal if @react-native-community/datetimepicker is not installed */}
        {fallbackOpen && (
          <>
            <View style={wiz.backdrop} />
            <View style={wiz.promptWrap}>
              <View style={[wiz.promptInnerFull]}>
                <View style={wiz.cardGlass} />
                <BlurView
                  style={wiz.promptGlass as any}
                  blurType="light"
                  blurAmount={12}
                  reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
                />
                <View style={wiz.promptScroll}>
                  <Text style={wiz.promptTitle}>Set purchase date</Text>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={fallbackDate}
                    onChangeText={setFallbackDate}
                    style={wiz.inputField}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                    <Pressable style={wiz.btn} onPress={() => setFallbackOpen(false)}>
                      <Text style={wiz.btnText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[wiz.btn, wiz.btnPrimary]} onPress={onFallbackSave}>
                      <Text style={wiz.btnText}>Set</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Prev / Create */}
        <View style={wiz.footerRowSplit}>
          <Pressable style={[wiz.splitBtn, wiz.splitBtnSecondary]} onPress={actions.goPrev}>
            <Text style={wiz.splitBtnText}>Previous</Text>
          </Pressable>
          <Pressable style={[wiz.splitBtn, wiz.splitBtnPrimary]} onPress={onCreate}>
            <Text style={wiz.splitBtnText}>Create</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
