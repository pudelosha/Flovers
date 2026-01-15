import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, TextInput, Platform, Alert, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

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
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();
  const [showPicker, setShowPicker] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackDate, setFallbackDate] = useState(state.purchaseDateISO ?? "");

  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage; // force dependency
        void _lang;
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  const placeholderName = useMemo(() => {
    return state.displayName && state.displayName.length > 0
      ? undefined
      : state.selectedPlant?.name ??
          getTranslation("createPlant.step08.placeholderName", "e.g. Living room Monstera");
  }, [state.displayName, state.selectedPlant?.name, getTranslation]);

  const onChangeDateNative = (_: any, date?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (date) actions.setPurchaseDateISO(toISODate(date));
  };

  const openPurchaseDate = () => {
    if (DateTimePicker) setShowPicker(true);
    else {
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
      Alert.alert(
        getTranslation("createPlant.step08.invalidDateTitle", "Invalid date"),
        getTranslation(
          "createPlant.step08.invalidDateMessage",
          "Please enter a valid date in the format YYYY-MM-DD."
        )
      );
      return;
    }
    actions.setPurchaseDateISO(toISODate(dt));
    setFallbackOpen(false);
  };

  return (
    <View style={wiz.cardWrap}>
      {/* CLIPPED CARD wraps glass + content so frame grows with content */}
      <View style={{ position: "relative", borderRadius: 28, overflow: "hidden" }}>
        {/* glass frame — gradient instead of blur */}
        <View style={wiz.cardGlass} pointerEvents="none">
          {/* Base green gradient (AuthCard match) */}
          <LinearGradient
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
            locations={[0, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />

          {/* Fog highlight (AuthCard match) */}
          <LinearGradient
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={[
              "rgba(255, 255, 255, 0.06)",
              "rgba(255, 255, 255, 0.02)",
              "rgba(255, 255, 255, 0.08)",
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View pointerEvents="none" style={wiz.cardTint} />
          <View pointerEvents="none" style={wiz.cardBorder} />
        </View>

        {/* content */}
        <View style={[wiz.cardInner, { paddingBottom: 48 }]}>
          <Text style={wiz.title}>
            {getTranslation("createPlant.step08.title", "Name & notes")}
          </Text>

          <Text style={wiz.subtitle}>
            {getTranslation(
              "createPlant.step08.subtitle",
              "Give your plant a display name, add any notes, and (optionally) set the purchase date so we can estimate its age."
            )}
          </Text>

          <Text style={wiz.sectionTitle}>
            {getTranslation("createPlant.step08.displayNameLabel", "Display name")}
          </Text>
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.6)"
            placeholder={placeholderName}
            value={state.displayName}
            onChangeText={actions.setDisplayName}
            style={wiz.inputField}
          />

          <Text style={wiz.sectionTitle}>
            {getTranslation("createPlant.step08.notesLabel", "Notes")}
          </Text>
          <TextInput
            placeholderTextColor="rgba(255,255,255,0.6)"
            placeholder={getTranslation(
              "createPlant.step08.notesPlaceholder",
              "Care tips, issues, where you bought it…"
            )}
            value={state.notes}
            onChangeText={actions.setNotes}
            style={[wiz.inputField, { minHeight: 96, textAlignVertical: "top" }]}
            multiline
          />

          <Text style={wiz.sectionTitle}>
            {getTranslation("createPlant.step08.purchaseDateLabel", "Purchase date (optional)")}
          </Text>
          <Pressable
            style={[wiz.selectField, { borderWidth: 0 }]}
            onPress={openPurchaseDate}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <Text style={wiz.selectValue}>
              {state.purchaseDateISO ?? getTranslation("createPlant.step08.notSet", "Not set")}
            </Text>
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
                  <Pressable
                    onPress={() => setShowPicker(false)}
                    style={({ pressed }) => [
                      wiz.nextBtnWide,
                      { backgroundColor: "rgba(11,114,133,0.9)", opacity: pressed ? 0.92 : 1 },
                    ]}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    <Text style={wiz.nextBtnText}>
                      {getTranslation("createPlant.step08.done", "Done")}
                    </Text>
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
                  <View style={wiz.promptGlass} pointerEvents="none">
                    {/* modal glass — same gradient system */}
                    <LinearGradient
                      pointerEvents="none"
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
                      locations={[0, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      colors={[
                        "rgba(255, 255, 255, 0.06)",
                        "rgba(255, 255, 255, 0.02)",
                        "rgba(255, 255, 255, 0.08)",
                      ]}
                      locations={[0, 0.5, 1]}
                      style={StyleSheet.absoluteFill}
                    />

                    <View pointerEvents="none" style={wiz.cardTint} />
                    <View pointerEvents="none" style={wiz.cardBorder} />
                  </View>

                  <View style={wiz.promptScroll}>
                    <Text style={wiz.promptTitle}>
                      {getTranslation("createPlant.step08.setPurchaseDateTitle", "Set purchase date")}
                    </Text>
                    <TextInput
                      placeholder={getTranslation("createPlant.step08.datePlaceholder", "YYYY-MM-DD")}
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
                          {
                            flex: 1,
                            backgroundColor: "rgba(255,255,255,0.12)",
                            opacity: pressed ? 0.92 : 1,
                            paddingHorizontal: 14,
                          },
                        ]}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={wiz.nextBtnText}>
                          {getTranslation("createPlant.step08.cancel", "Cancel")}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={onFallbackSave}
                        style={({ pressed }) => [
                          wiz.nextBtnWide,
                          {
                            flex: 1,
                            backgroundColor: "rgba(11,114,133,0.9)",
                            opacity: pressed ? 0.92 : 1,
                            paddingHorizontal: 14,
                          },
                        ]}
                        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                      >
                        <Text style={wiz.nextBtnText}>
                          {getTranslation("createPlant.step08.set", "Set")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
