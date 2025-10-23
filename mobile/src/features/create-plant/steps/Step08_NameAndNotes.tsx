// steps/Step08_NameAndNotes.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Platform, Alert } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

let DateTimePicker: any = null;
try { DateTimePicker = require("@react-native-community/datetimepicker").default; } catch {}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

export default function Step08_NameAndNotes() {
  const { state, actions } = useCreatePlantWizard();
  const [showPicker, setShowPicker] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackDate, setFallbackDate] = useState(state.purchaseDateISO ?? "");

  const placeholderName = useMemo(() => {
    return state.displayName && state.displayName.length > 0
      ? undefined
      : state.selectedPlant?.name ?? "e.g. Living room Monstera";
  }, [state.displayName, state.selectedPlant?.name]);

  const onChangeDateNative = (_: any, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (date) actions.setPurchaseDateISO(toISODate(date));
  };
  const openPurchaseDate = () => {
    if (DateTimePicker) setShowPicker(true);
    else { setFallbackDate(state.purchaseDateISO ?? ""); setFallbackOpen(true); }
  };
  const onFallbackSave = () => {
    if (!fallbackDate) { actions.setPurchaseDateISO(undefined); setFallbackOpen(false); return; }
    const dt = parseISODate(fallbackDate.trim());
    if (!dt) { Alert.alert("Invalid date", "Please enter a valid date in the format YYYY-MM-DD."); return; }
    actions.setPurchaseDateISO(toISODate(dt)); setFallbackOpen(false);
  };

  const onCreate = () => actions.goTo("creating");

  return (
    <View style={wiz.cardWrap}>
      {/* CLIPPED CARD wraps glass + content so frame grows with content */}
      <View style={{ position: "relative", borderRadius: 28, overflow: "hidden" }}>
        {/* glass frame — same as other steps */}
        <View style={wiz.cardGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={20}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="transparent"
          />
          <View pointerEvents="none" style={wiz.cardTint} />
          <View pointerEvents="none" style={wiz.cardBorder} />
        </View>

        {/* content */}
        <View style={[wiz.cardInner, { paddingBottom: 48 }]}>
          <Text style={wiz.title}>Name & notes</Text>
          <Text style={wiz.subtitle}>
            Give your plant a display name, add any notes, and (optionally) set the purchase date so we can estimate its age.
          </Text>

          <Text style={wiz.sectionTitle}>Display name</Text>
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.6)"
            placeholder={placeholderName}
            value={state.displayName}
            onChangeText={actions.setDisplayName}
            style={wiz.inputField}
          />

          <Text style={wiz.sectionTitle}>Notes</Text>
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.6)"
            placeholder="Care tips, issues, where you bought it…"
            value={state.notes}
            onChangeText={actions.setNotes}
            style={[wiz.inputField, { minHeight: 96, textAlignVertical: "top" }]}
            multiline
          />

          <Text style={wiz.sectionTitle}>Purchase date (optional)</Text>
          <Pressable
            style={[wiz.selectField, { borderWidth: 0 }]}
            onPress={openPurchaseDate}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <Text style={wiz.selectValue}>{state.purchaseDateISO ?? "Not set"}</Text>
            <View style={wiz.selectChevronPad}>
              <MaterialCommunityIcons name="calendar" size={20} color="#FFFFFF" />
            </View>
          </Pressable>

          {showPicker && DateTimePicker && (
            <View style={{ marginBottom: 10 }}>
              <DateTimePicker
                value={state.purchaseDateISO ? new Date(state.purchaseDateISO + "T00:00:00") : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onChangeDateNative}
                maximumDate={new Date()}
              />
              {Platform.OS === "ios" && (
                <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable
                    onPress={() => setShowPicker(false)}
                    style={({ pressed }) => [
                      wiz.nextBtnWide,
                      { backgroundColor: "rgba(11,114,133,0.9)", opacity: pressed ? 0.92 : 1 },
                    ]}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    <Text style={wiz.nextBtnText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {fallbackOpen && (
            <>
              <View style={wiz.backdrop} />
              <View style={wiz.promptWrap}>
                <View style={wiz.promptInnerFull}>
                  <View style={wiz.promptGlass}>
                    <BlurView
                      style={{ position: "absolute", inset: 0 } as any}
                      blurType="light"
                      blurAmount={20}
                      overlayColor="transparent"
                      reducedTransparencyFallbackColor="transparent"
                    />
                    <View pointerEvents="none" style={wiz.cardTint} />
                    <View pointerEvents="none" style={wiz.cardBorder} />
                  </View>

                  <View style={wiz.promptScroll}>
                    <Text style={wiz.promptTitle}>Set purchase date</Text>
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={fallbackDate}
                      onChangeText={setFallbackDate}
                      style={wiz.inputField}
                    />
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                      <Pressable
                        onPress={() => setFallbackOpen(false)}
                        style={({ pressed }) => [
                          wiz.nextBtnWide,
                          { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.92 : 1, paddingHorizontal: 14 },
                        ]}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={wiz.nextBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={onFallbackSave}
                        style={({ pressed }) => [
                          wiz.nextBtnWide,
                          { flex: 1, backgroundColor: "rgba(11,114,133,0.9)", opacity: pressed ? 0.92 : 1, paddingHorizontal: 14 },
                        ]}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={wiz.nextBtnText}>Set</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Footer buttons — now sit above the curve */}
          <View style={[wiz.buttonRowDual, { alignSelf: "stretch", marginTop: 12 }]}>
            <Pressable
              onPress={actions.goPrev}
              style={({ pressed }) => [
                wiz.nextBtnWide,
                { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 14, opacity: pressed ? 0.92 : 1 },
              ]}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
                <Text style={wiz.nextBtnText}>Previous</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={onCreate}
              style={({ pressed }) => [
                wiz.nextBtnWide,
                { flex: 1, backgroundColor: "rgba(11,114,133,0.9)", paddingHorizontal: 14, opacity: pressed ? 0.92 : 1 },
              ]}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", width: "100%" }}>
                <Text style={wiz.nextBtnText}>Create</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
