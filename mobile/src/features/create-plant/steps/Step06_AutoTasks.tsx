// steps/Step06_AutoTasks.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  LAST_REPOTTED_OPTIONS,
  LAST_WATERED_OPTIONS,
} from "../constants/create-plant.constants";
import type { LastRepotted, LastWatered } from "../types/create-plant.types";

// Try slider if installed
let SliderView: any = View;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SliderView = require("@react-native-community/slider").default;
} catch {}

const PRIMARY = "#0B7285";

/* ------------------------------------------------------------------ */
/* UI helpers (unchanged)                                              */
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
  notSpecifiedDesc = "Skip if you’re not sure.",
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
  max = 30,
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

  const canAutoCreate = !!state.selectedPlant?.predefined;

  // Safe translation (treat key-echo as missing)
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage; // force dependency for rerender
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  /**
   * 🔁 Auto-prefill from plant definition
   * Safe, one-time, never overwrites user input
   */
  useEffect(() => {
    if (!canAutoCreate) return;

    const pd: any = (state as any).selectedPlantDefinition;
    if (!pd) return;

    if (!state.createAutoTasks) {
      actions.setCreateAutoTasks(true);
    }

    if (pd.water_required && !state.waterTaskEnabled) {
      actions.setWaterTaskEnabled(true);
    }

    if (
      pd.moisture_required &&
      !state.moistureRequired &&
      typeof pd.moisture_interval_days === "number"
    ) {
      actions.setMoistureRequired(true);
      actions.setMoistureInterval(pd.moisture_interval_days);
    }

    if (
      pd.fertilize_required &&
      !state.fertilizeRequired &&
      typeof pd.fertilize_interval_days === "number"
    ) {
      actions.setFertilizeRequired(true);
      actions.setFertilizeInterval(pd.fertilize_interval_days);
    }

    if (
      pd.repot_required &&
      !state.repotTaskEnabled &&
      typeof pd.repot_interval_months === "number"
    ) {
      actions.setRepotTaskEnabled(true);
      actions.setRepotIntervalMonths(pd.repot_interval_months);
    }
  }, [canAutoCreate, state, actions]);

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

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>
          {getTranslation("createPlant.step06.title", "Automatic tasks")}
        </Text>
        <Text style={wiz.subtitle}>
          {getTranslation(
            "createPlant.step06.subtitle",
            "We can auto-create reminders (watering, repotting, moisture, fertilising, care) based on your plant profile."
          )}
        </Text>

        <SectionCheckbox
          checked={!!state.createAutoTasks}
          onToggle={() =>
            canAutoCreate && actions.setCreateAutoTasks(!state.createAutoTasks)
          }
          label={getTranslation(
            "createPlant.step06.createAutoTasks",
            "Create auto tasks for this plant"
          )}
          disabled={!canAutoCreate}
        />

        {!canAutoCreate && (
          <Text style={wiz.smallMuted}>
            {getTranslation(
              "createPlant.step06.requiresPredefined",
              "This requires a predefined plant."
            )}
          </Text>
        )}

        {canAutoCreate && state.createAutoTasks && (
          <>
            {/* WATERING */}
            <Text style={wiz.sectionTitle}>
              {getTranslation("createPlant.step06.sections.watering", "Watering")}
            </Text>
            <SectionCheckbox
              checked={!!state.waterTaskEnabled}
              onToggle={() => actions.setWaterTaskEnabled(!state.waterTaskEnabled)}
              label={getTranslation(
                "createPlant.step06.labels.generateWateringTask",
                "Generate watering task"
              )}
            />

            {state.waterTaskEnabled && (
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
                    "Skip if you’re not sure."
                  )}
                />
              </>
            )}

            {/* MOISTURE */}
            <Text style={wiz.sectionTitle}>
              {getTranslation("createPlant.step06.sections.moisture", "Moisture / misting")}
            </Text>
            <SectionCheckbox
              checked={!!state.moistureRequired}
              onToggle={() => actions.setMoistureRequired(!state.moistureRequired)}
              label={getTranslation(
                "createPlant.step06.labels.generateMoistureTask",
                "Generate moisture task"
              )}
            />

            {state.moistureRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation("createPlant.step06.prompts.selectIntervalDays", "Select interval (days)")}
                </Text>
                <DaysSlider
                  value={state.moistureIntervalDays}
                  onChange={(d) => actions.setMoistureInterval(d)}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* FERTILISING */}
            <Text style={wiz.sectionTitle}>
              {getTranslation("createPlant.step06.sections.fertilising", "Fertilising")}
            </Text>
            <SectionCheckbox
              checked={!!state.fertilizeRequired}
              onToggle={() => actions.setFertilizeRequired(!state.fertilizeRequired)}
              label={getTranslation(
                "createPlant.step06.labels.generateFertilisingTask",
                "Generate fertilising task"
              )}
            />

            {state.fertilizeRequired && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation("createPlant.step06.prompts.selectIntervalDays", "Select interval (days)")}
                </Text>
                <DaysSlider
                  value={state.fertilizeIntervalDays}
                  onChange={(d) => actions.setFertilizeInterval(d)}
                  max={60}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* CARE */}
            <Text style={wiz.sectionTitle}>
              {getTranslation("createPlant.step06.sections.care", "Care / trimming")}
            </Text>
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
                  {getTranslation("createPlant.step06.prompts.selectIntervalDays", "Select interval (days)")}
                </Text>
                <DaysSlider
                  value={state.careIntervalDays}
                  onChange={(d) => actions.setCareInterval(d)}
                  max={60}
                  dayLabel={dayLabel}
                  daysLabel={daysLabel}
                />
              </>
            )}

            {/* REPOTTING */}
            <Text style={wiz.sectionTitle}>
              {getTranslation("createPlant.step06.sections.repotting", "Repotting")}
            </Text>
            <SectionCheckbox
              checked={!!state.repotTaskEnabled}
              onToggle={() => actions.setRepotTaskEnabled(!state.repotTaskEnabled)}
              label={getTranslation(
                "createPlant.step06.labels.generateRepottingTask",
                "Generate repotting task"
              )}
            />

            {state.repotTaskEnabled && (
              <>
                <Text style={wiz.smallMuted}>
                  {getTranslation("createPlant.step06.prompts.recommendedInterval", "Recommended interval")}
                </Text>
                <MonthsSlider
                  value={state.repotIntervalMonths}
                  onChange={(m) => actions.setRepotIntervalMonths(m)}
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
                    "Skip if you’re not sure."
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
