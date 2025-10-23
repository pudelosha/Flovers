// steps/Step06_AutoTasks.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import {
  LAST_REPOTTED_OPTIONS,
  LAST_WATERED_OPTIONS,
} from "../constants/create-plant.constants";
import type { LastRepotted, LastWatered } from "../types/create-plant.types";

// Try slider if installed (same approach as your other pages)
let SliderView: any = View;
try {
  SliderView = require("@react-native-community/slider").default;
} catch {}

const PRIMARY = "#0B7285"; // matches rgba(11,114,133,0.9)

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
}: {
  open: boolean;
  valueLabel: string;
  onToggle: () => void;
  options: readonly { key: T; label: string }[];
  onSelect: (k?: T) => void;
  showNotSpecified?: boolean;
}) {
  return (
    <>
      <Pressable style={wiz.selectField} onPress={onToggle}>
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
                <Text style={wiz.dropdownItemText}>Not specified</Text>
                <Text style={wiz.dropdownItemDesc}>Skip if you’re not sure.</Text>
              </Pressable>
            )}
            {options.map(opt => (
              <Pressable key={opt.key} style={wiz.dropdownItem} onPress={() => onSelect(opt.key)}>
                <Text style={wiz.dropdownItemText}>{opt.label}</Text>
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
}: {
  value: number | undefined;
  onChange: (d: number) => void;
  min?: number;
  max?: number;
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
        {v} {v === 1 ? "day" : "days"}
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
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(d => (
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
}: {
  value: number | undefined;
  onChange: (m: number) => void;
  min?: number;
  max?: number;
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
        {v} {v === 1 ? "month" : "months"}
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
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(m => (
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

export default function Step06_AutoTasks() {
  const { state, actions } = useCreatePlantWizard();

  // which inline dropdown is open
  const [openWhich, setOpenWhich] = useState<"watered" | "repotted" | null>(null);

  const canAutoCreate = !!state.selectedPlant?.predefined;

  const wateredLabel = useMemo(() => {
    if (!state.lastWatered) return "Not specified";
    return LAST_WATERED_OPTIONS.find(o => o.key === state.lastWatered)?.label ?? "Not specified";
  }, [state.lastWatered]);

  const repottedLabel = useMemo(() => {
    if (!state.lastRepotted) return "Not specified";
    return LAST_REPOTTED_OPTIONS.find(o => o.key === state.lastRepotted)?.label ?? "Not specified";
  }, [state.lastRepotted]);

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
        <Text style={wiz.title}>Automatic tasks</Text>
        <Text style={wiz.subtitle}>
          We can auto-create reminders (watering, repotting, moisture, fertilising, care) based on
          your plant profile. You can edit them later in the plant details.
        </Text>

        {/* master toggle (enabling sets Watering ON by default) */}
        <SectionCheckbox
          checked={!!state.createAutoTasks}
          onToggle={() => canAutoCreate && actions.setCreateAutoTasks(!state.createAutoTasks)}
          label="Create auto tasks for this plant"
          disabled={!canAutoCreate}
        />
        {!canAutoCreate && (
          <Text style={wiz.smallMuted}>
            This requires a predefined plant (choose a plant in step 1). You can still add tasks later manually.
          </Text>
        )}

        {/* only show the rest if allowed + enabled */}
        {canAutoCreate && state.createAutoTasks && (
          <>
            {/* 1) WATERING */}
            <Text style={wiz.sectionTitle}>Watering</Text>
            <SectionCheckbox
              checked={!!state.waterTaskEnabled}
              onToggle={() => actions.setWaterTaskEnabled(!state.waterTaskEnabled)}
              label="Generate watering task"
            />
            {state.waterTaskEnabled && (
              <>
                <Text style={wiz.smallMuted}>When was it last watered?</Text>
                <InlineDropdown<LastWatered>
                  open={openWhich === "watered"}
                  valueLabel={wateredLabel}
                  onToggle={() => setOpenWhich(openWhich === "watered" ? null : "watered")}
                  options={LAST_WATERED_OPTIONS}
                  onSelect={(k) => {
                    actions.setLastWatered(k as LastWatered | undefined);
                    setOpenWhich(null);
                  }}
                />
              </>
            )}

            {/* 2) MOISTURE / MISTING */}
            <Text style={wiz.sectionTitle}>Moisture / misting</Text>
            <SectionCheckbox
              checked={!!state.moistureRequired}
              onToggle={() => actions.setMoistureRequired(!state.moistureRequired)}
              label="Generate moisture task"
            />
            {state.moistureRequired && (
              <>
                <Text style={wiz.smallMuted}>Select interval (days)</Text>
                <DaysSlider
                  value={state.moistureIntervalDays}
                  onChange={(d) => actions.setMoistureInterval(d)}
                  min={1}
                  max={30}
                />
              </>
            )}

            {/* 3) FERTILISING */}
            <Text style={wiz.sectionTitle}>Fertilising</Text>
            <SectionCheckbox
              checked={!!state.fertilizeRequired}
              onToggle={() => actions.setFertilizeRequired(!state.fertilizeRequired)}
              label="Generate fertilising task"
            />
            {state.fertilizeRequired && (
              <>
                <Text style={wiz.smallMuted}>Select interval (days)</Text>
                <DaysSlider
                  value={state.fertilizeIntervalDays}
                  onChange={(d) => actions.setFertilizeInterval(d)}
                  min={1}
                  max={60}
                />
              </>
            )}

            {/* 4) CARE / TRIMMING */}
            <Text style={wiz.sectionTitle}>Care / trimming</Text>
            <SectionCheckbox
              checked={!!state.careRequired}
              onToggle={() => actions.setCareRequired(!state.careRequired)}
              label="Generate care task"
            />
            {state.careRequired && (
              <>
                <Text style={wiz.smallMuted}>Select interval (days)</Text>
                <DaysSlider
                  value={state.careIntervalDays}
                  onChange={(d) => actions.setCareInterval(d)}
                  min={1}
                  max={60}
                />
              </>
            )}

            {/* 5) REPOTTING */}
            <Text style={wiz.sectionTitle}>Repotting</Text>
            <SectionCheckbox
              checked={!!state.repotTaskEnabled}
              onToggle={() => actions.setRepotTaskEnabled(!state.repotTaskEnabled)}
              label="Generate repotting task"
            />
            {state.repotTaskEnabled && (
              <>
                <Text style={wiz.smallMuted}>Recommended interval</Text>
                <MonthsSlider
                  value={state.repotIntervalMonths}
                  onChange={(m) => actions.setRepotIntervalMonths(m)}
                  min={1}
                  max={12}
                />
                <Text style={wiz.smallMuted}>When was it last repotted?</Text>
                <InlineDropdown<LastRepotted>
                  open={openWhich === "repotted"}
                  valueLabel={repottedLabel}
                  onToggle={() => setOpenWhich(openWhich === "repotted" ? null : "repotted")}
                  options={LAST_REPOTTED_OPTIONS}
                  onSelect={(k) => {
                    actions.setLastRepotted(k as LastRepotted | undefined);
                    setOpenWhich(null);
                  }}
                />
              </>
            )}
          </>
        )}

        {/* Prev / Next — unified with Steps 1–5 (flat, same height, arrows) */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch" }]}>
          <Pressable
            onPress={actions.goPrev}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.12)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
              <Text style={wiz.nextBtnText}>Previous</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={actions.goNext}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(11,114,133,0.9)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
