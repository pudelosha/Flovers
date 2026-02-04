// steps/Step06_AutoTasks.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  LAST_REPOTTED_OPTIONS,
  LAST_WATERED_OPTIONS,
} from "../constants/create-plant.constants";
import type { LastRepotted, LastWatered } from "../types/create-plant.types";

// ✅ interval tuning helper
import {
  tuneDaysInterval,
  hasMeaningfulTuningSignals,
  type IntervalTuningContext,
} from "../utils/intervalTuning";

// Try slider if installed
let SliderView: any = View;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SliderView = require("@react-native-community/slider").default;
} catch {}

const PRIMARY = "#0B7285";

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

/* ------------------------------------------------------------------ */
/* UI helpers                                                         */
/* ------------------------------------------------------------------ */

function SectionCheckbox({
  checked,
  onToggle,
  label,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={!disabled ? onToggle : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 10,
        marginBottom: 6,
        opacity: disabled ? 0.55 : 1,
      }}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
    >
      <MaterialCommunityIcons
        name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
        size={22}
        color="#FFFFFF"
      />
      <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function InlineDropdown<T extends string>({
  open,
  valueLabel,
  onToggle,
  options,
  onSelect,
  showNotSpecified = true,
  notSpecifiedLabel = "Not specified",
  notSpecifiedDesc = "Skip if you're not sure.",
}: {
  open: boolean;
  valueLabel: string;
  onToggle: () => void;
  options: readonly { key: T; label?: string }[];
  onSelect: (k?: T) => void;
  showNotSpecified?: boolean;
  notSpecifiedLabel?: string;
  notSpecifiedDesc?: string;
}) {
  return (
    <>
      <Pressable
        style={wiz.selectField}
        onPress={onToggle}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <Text style={wiz.selectValue}>{valueLabel}</Text>
        <View style={wiz.selectChevronPad}>
          <MaterialCommunityIcons
            name={open ? "chevron-up" : "chevron-down"}
            size={20}
            color="#FFFFFF"
          />
        </View>
      </Pressable>

      {open && (
        <View style={wiz.dropdownList}>
          <ScrollView
            style={wiz.dropdownListScroll}
            contentContainerStyle={{ paddingVertical: 4 }}
            nestedScrollEnabled
          >
            {showNotSpecified && (
              <Pressable style={wiz.dropdownItem} onPress={() => onSelect(undefined)}>
                <Text style={wiz.dropdownItemText}>{notSpecifiedLabel}</Text>
                <Text style={wiz.dropdownItemDesc}>{notSpecifiedDesc}</Text>
              </Pressable>
            )}

            {options.map((opt) => (
              <Pressable
                key={opt.key}
                style={wiz.dropdownItem}
                onPress={() => onSelect(opt.key)}
              >
                <Text style={wiz.dropdownItemText}>{opt.label ?? String(opt.key)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

function DaysSlider({
  value,
  onChange,
  min = 1,
  max = 90,
  dayLabel = "day",
  daysLabel = "days",
}: {
  value: number | undefined;
  onChange: (d: number) => void;
  min?: number;
  max?: number;
  dayLabel?: string;
  daysLabel?: string;
}) {
  const v = Math.max(min, Math.min(max, value ?? min));

  return (
    <View style={{ marginTop: 6, marginBottom: 6 }}>
      <Text
        style={{
          color: "#FFFFFF",
          fontWeight: "800",
          alignSelf: "flex-end",
          marginBottom: 4,
        }}
      >
        {v} {v === 1 ? dayLabel : daysLabel}
      </Text>

      {SliderView !== View ? (
        <SliderView
          value={v}
          onValueChange={(num: number) => onChange(Math.round(num))}
          onSlidingComplete={(num: number) => onChange(Math.round(num))}
          minimumValue={min}
          maximumValue={max}
          step={1}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="rgba(255,255,255,0.35)"
          thumbTintColor={PRIMARY}
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((d) => (
            <Pressable
              key={d}
              onPress={() => onChange(d)}
              style={[wiz.hItem, d === v ? wiz.hItemActive : undefined]}
            >
              <Text style={wiz.hItemText}>{d}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function MonthsSlider({
  value,
  onChange,
  min = 1,
  max = 12,
  monthLabel = "month",
  monthsLabel = "months",
}: {
  value: number | undefined;
  onChange: (m: number) => void;
  min?: number;
  max?: number;
  monthLabel?: string;
  monthsLabel?: string;
}) {
  const v = Math.max(min, Math.min(max, value ?? min));

  return (
    <View style={{ marginTop: 6, marginBottom: 6 }}>
      <Text
        style={{
          color: "#FFFFFF",
          fontWeight: "800",
          alignSelf: "flex-end",
          marginBottom: 4,
        }}
      >
        {v} {v === 1 ? monthLabel : monthsLabel}
      </Text>

      {SliderView !== View ? (
        <SliderView
          value={v}
          onValueChange={(num: number) => onChange(Math.round(num))}
          onSlidingComplete={(num: number) => onChange(Math.round(num))}
          minimumValue={min}
          maximumValue={max}
          step={1}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="rgba(255,255,255,0.35)"
          thumbTintColor={PRIMARY}
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((m) => (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={[wiz.hItem, m === v ? wiz.hItemActive : undefined]}
            >
              <Text style={wiz.hItemText}>{m}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN STEP                                                          */
/* ------------------------------------------------------------------ */

export default function Step06_AutoTasks() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();
  const [openWhich, setOpenWhich] = useState<"watered" | "repotted" | null>(null);

  // main checkbox enabled ONLY if plantDefinition exists
  const plantDefinition = (state as any).selectedPlantDefinition as any;
  const canAutoCreate = !!plantDefinition;

  // Safe translation (treat key-echo as missing)
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage;
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

  // Flags
  const waterRequired = plantDefinition?.water_required === true;
  const mistRequired = plantDefinition?.moisture_required === true;
  const fertilizeRequired = plantDefinition?.fertilize_required === true;
  const repotRequired = plantDefinition?.repot_required === true;

  // Base intervals from definition
  const waterIntervalBase =
    typeof plantDefinition?.water_interval_days === "number"
      ? plantDefinition.water_interval_days
      : 7;
  const mistIntervalBase =
    typeof plantDefinition?.moisture_interval_days === "number"
      ? plantDefinition.moisture_interval_days
      : 7;
  const fertilizeIntervalBase =
    typeof plantDefinition?.fertilize_interval_days === "number"
      ? plantDefinition.fertilize_interval_days
      : 30;
  const repotIntervalBase =
    typeof plantDefinition?.repot_interval_months === "number"
      ? plantDefinition.repot_interval_months
      : 12;

  // ✅ build tuning context from wizard state (earlier steps)
  const tuningCtx: IntervalTuningContext = useMemo(
    () => ({
      lightLevel: state.lightLevel,
      orientation: state.orientation,
      distanceCm: state.distanceCm,
      potMaterial: (state.potMaterial as any) ?? undefined,
      soilMix: (state.soilMix as any) ?? undefined,
    }),
    [state.lightLevel, state.orientation, state.distanceCm, state.potMaterial, state.soilMix]
  );

  // ✅ compute tuned suggestion (only for watering as requested)
  const tunedWaterSuggestion = useMemo(() => {
    return tuneDaysInterval(waterIntervalBase, tuningCtx, {
      minDays: 1,
      maxDays: 90,
      maxDelta: 2,
    });
  }, [waterIntervalBase, tuningCtx]);

  /**
   * Prefill intervals ONCE per plantDefinition (no auto-check).
   * Force disabled tasks OFF.
   */
  const didInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!plantDefinition) return;

    const key = String(plantDefinition?.id ?? plantDefinition?.external_id ?? "pd");
    if (didInitRef.current === key) return;
    didInitRef.current = key;

    // ✅ prefill: watering uses tuned suggestion (but only if meaningful signals exist)
    const shouldTune = hasMeaningfulTuningSignals(tuningCtx);
    actions.setWaterIntervalDays(shouldTune ? tunedWaterSuggestion : waterIntervalBase);

    // keep others as-is (you can tune them later if you want)
    if (typeof plantDefinition?.moisture_interval_days === "number") {
      actions.setMoistureInterval(plantDefinition.moisture_interval_days);
    }
    if (typeof plantDefinition?.fertilize_interval_days === "number") {
      actions.setFertilizeInterval(plantDefinition.fertilize_interval_days);
    }
    if (typeof plantDefinition?.repot_interval_months === "number") {
      actions.setRepotIntervalMonths(plantDefinition.repot_interval_months);
    }

    if (plantDefinition?.water_required !== true) actions.setWaterTaskEnabled(false);
    if (plantDefinition?.moisture_required !== true) actions.setMoistureRequired(false);
    if (plantDefinition?.fertilize_required !== true) actions.setFertilizeRequired(false);
    if (plantDefinition?.repot_required !== true) actions.setRepotTaskEnabled(false);
  }, [
    plantDefinition,
    actions,
    tuningCtx,
    tunedWaterSuggestion,
    waterIntervalBase,
  ]);

  /**
   * ✅ If user changes tuning signals after initial init (e.g. goes back to exposure/pot)
   * update suggested watering interval ONLY if user did NOT manually change it.
   *
   * Rule:
   * - we keep a ref of last "suggested" value
   * - if current state.waterIntervalDays equals that last suggested (or equals base),
   *   then we treat it as "not manually edited" and can update it.
   */
  const lastSuggestedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!plantDefinition) return;

    const shouldTune = hasMeaningfulTuningSignals(tuningCtx);
    const nextSuggested = shouldTune ? tunedWaterSuggestion : waterIntervalBase;

    const current = state.waterIntervalDays;

    const lastSuggested = lastSuggestedRef.current;
    const looksAuto =
      lastSuggested == null
        ? current === waterIntervalBase || current === 7
        : current === lastSuggested || current === waterIntervalBase;

    if (looksAuto && current !== nextSuggested) {
      actions.setWaterIntervalDays(nextSuggested);
    }

    lastSuggestedRef.current = nextSuggested;
  }, [
    plantDefinition,
    tuningCtx,
    tunedWaterSuggestion,
    waterIntervalBase,
    state.waterIntervalDays,
    actions,
  ]);

  // If user turns off "createAutoTasks", close dropdowns
  useEffect(() => {
    if (!state.createAutoTasks) setOpenWhich(null);
  }, [state.createAutoTasks]);

  const wateredLabel = useMemo(() => {
    if (!state.lastWatered) return getTranslation("createPlant.step06.notSpecified", "Not specified");
    const opt = LAST_WATERED_OPTIONS.find((o) => o.key === state.lastWatered);
    return (
      getTranslation(
        `createPlant.step06.lastWatered.${String(opt?.key)}`,
        (opt as any)?.label
      ) || getTranslation("createPlant.step06.notSpecified", "Not specified")
    );
  }, [state.lastWatered, getTranslation]);

  const repottedLabel = useMemo(() => {
    if (!state.lastRepotted) return getTranslation("createPlant.step06.notSpecified", "Not specified");
    const opt = LAST_REPOTTED_OPTIONS.find((o) => o.key === state.lastRepotted);
    return (
      getTranslation(
        `createPlant.step06.lastRepotted.${String(opt?.key)}`,
        (opt as any)?.label
      ) || getTranslation("createPlant.step06.notSpecified", "Not specified")
    );
  }, [state.lastRepotted, getTranslation]);

  const dayLabel = getTranslation("createPlant.step06.units.day", "day");
  const daysLabel = getTranslation("createPlant.step06.units.days", "days");
  const monthLabel = getTranslation("createPlant.step06.units.month", "month");
  const monthsLabel = getTranslation("createPlant.step06.units.months", "months");

  return (
    <View style={wiz.cardWrap}>
      <View style={wiz.cardGlass} pointerEvents="none">
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
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

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>
          {getTranslation("createPlant.step06.title", "Automatic tasks")}
        </Text>
        <Text style={wiz.subtitle}>
          {getTranslation(
            "createPlant.step06.subtitle",
            "We can auto-create reminders (watering, repotting, misting, fertilising, care) based on your plant profile."
          )}
        </Text>

        <SectionCheckbox
          checked={!!state.createAutoTasks}
          onToggle={() => {
            if (!canAutoCreate) return;
            actions.setCreateAutoTasks(!state.createAutoTasks);
          }}
          label={getTranslation(
            "createPlant.step06.createAutoTasks",
            "Create auto tasks for this plant"
          )}
          disabled={!canAutoCreate}
        />

        {!canAutoCreate && (
          <Text style={wiz.smallMuted}>
            {getTranslation(
              "createPlant.step06.requiresPlantDefinition",
              "This requires a plant definition."
            )}
          </Text>
        )}

        {canAutoCreate && state.createAutoTasks && (
          <>
            {/* WATERING */}
            <SectionCheckbox
              checked={!!state.waterTaskEnabled}
              onToggle={() => {
                if (!waterRequired) return;
                actions.setWaterTaskEnabled(!state.waterTaskEnabled);
                if (state.waterTaskEnabled) setOpenWhich(null);
              }}
              label={getTranslation(
                "createPlant.step06.labels.generateWateringTask",
                "Generate watering task"
              )}
              disabled={!waterRequired}
            />

            {state.waterTaskEnabled && waterRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.lastWatered",
                    "When was it last watered?"
                  )}
                </Text>
                <InlineDropdown<LastWatered>
                  open={openWhich === "watered"}
                  valueLabel={wateredLabel}
                  onToggle={() =>
                    setOpenWhich(openWhich === "watered" ? null : "watered")
                  }
                  options={LAST_WATERED_OPTIONS as any}
                  onSelect={(k) => {
                    actions.setLastWatered(k as LastWatered | undefined);
                    setOpenWhich(null);
                  }}
                  notSpecifiedLabel={getTranslation(
                    "createPlant.step06.notSpecified",
                    "Not specified"
                  )}
                  notSpecifiedDesc={getTranslation(
                    "createPlant.step06.notSpecifiedDesc",
                    "Skip if you're not sure."
                  )}
                />

                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.selectIntervalDays",
                    "Select interval (days)"
                  )}
                </Text>
                <DaysSlider
                  // ✅ provider now holds tuned suggestion (unless user manually changed)
                  value={state.waterIntervalDays ?? waterIntervalBase}
                  onChange={(d) => actions.setWaterIntervalDays?.(d)}
                  min={1}
                  max={90}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* MISTING */}
            <SectionCheckbox
              checked={!!state.moistureRequired}
              onToggle={() => {
                if (!mistRequired) return;
                actions.setMoistureRequired(!state.moistureRequired);
              }}
              label={getTranslation(
                "createPlant.step06.labels.generateMistingTask",
                "Generate misting task"
              )}
              disabled={!mistRequired}
            />

            {state.moistureRequired && mistRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.selectIntervalDays",
                    "Select interval (days)"
                  )}
                </Text>
                <DaysSlider
                  value={state.moistureIntervalDays ?? mistIntervalBase}
                  onChange={(d) => actions.setMoistureInterval(d)}
                  min={1}
                  max={90}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* FERTILISING */}
            <SectionCheckbox
              checked={!!state.fertilizeRequired}
              onToggle={() => {
                if (!fertilizeRequired) return;
                actions.setFertilizeRequired(!state.fertilizeRequired);
              }}
              label={getTranslation(
                "createPlant.step06.labels.generateFertilisingTask",
                "Generate fertilising task"
              )}
              disabled={!fertilizeRequired}
            />

            {state.fertilizeRequired && fertilizeRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.selectIntervalDays",
                    "Select interval (days)"
                  )}
                </Text>
                <DaysSlider
                  value={state.fertilizeIntervalDays ?? fertilizeIntervalBase}
                  onChange={(d) => actions.setFertilizeInterval(d)}
                  min={1}
                  max={90}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* CARE */}
            <SectionCheckbox
              checked={!!state.careRequired}
              onToggle={() => actions.setCareRequired(!state.careRequired)}
              label={getTranslation(
                "createPlant.step06.labels.generateCareTask",
                "Generate care task"
              )}
            />

            {state.careRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.selectIntervalDays",
                    "Select interval (days)"
                  )}
                </Text>
                <DaysSlider
                  value={state.careIntervalDays ?? 30}
                  onChange={(d) => actions.setCareInterval(d)}
                  min={1}
                  max={90}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* REPOTTING */}
            <SectionCheckbox
              checked={!!state.repotTaskEnabled}
              onToggle={() => {
                if (!repotRequired) return;
                actions.setRepotTaskEnabled(!state.repotTaskEnabled);
                if (state.repotTaskEnabled) setOpenWhich(null);
              }}
              label={getTranslation(
                "createPlant.step06.labels.generateRepottingTask",
                "Generate repotting task"
              )}
              disabled={!repotRequired}
            />

            {state.repotTaskEnabled && repotRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.recommendedInterval",
                    "Recommended interval"
                  )}
                </Text>
                <MonthsSlider
                  value={state.repotIntervalMonths ?? repotIntervalBase}
                  onChange={(m) => actions.setRepotIntervalMonths(m)}
                  min={1}
                  max={12}
                  monthLabel={monthLabel}
                  monthsLabel={monthsLabel}
                />

                <Text style={wiz.smallMuted}>
                  {getTranslation(
                    "createPlant.step06.prompts.lastRepotted",
                    "When was it last repotted?"
                  )}
                </Text>
                <InlineDropdown<LastRepotted>
                  open={openWhich === "repotted"}
                  valueLabel={repottedLabel}
                  onToggle={() =>
                    setOpenWhich(openWhich === "repotted" ? null : "repotted")
                  }
                  options={LAST_REPOTTED_OPTIONS as any}
                  onSelect={(k) => {
                    actions.setLastRepotted(k as LastRepotted | undefined);
                    setOpenWhich(null);
                  }}
                  notSpecifiedLabel={getTranslation(
                    "createPlant.step06.notSpecified",
                    "Not specified"
                  )}
                  notSpecifiedDesc={getTranslation(
                    "createPlant.step06.notSpecifiedDesc",
                    "Skip if you're not sure."
                  )}
                />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}
