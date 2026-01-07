import React from "react";
import {
  View,
  Text,
  Pressable,
  Keyboard,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { s } from "../../styles/plants.styles";

// live fetch + mapping
import { fetchPlantJournal } from "../../../../api/services/plant-instances.service";
import {
  buildUIJournalEntries,
  type UIJournalEntry,
  type JournalTypeUI,
} from "../../../../api/serializers/plant-journal.serializer";

type JournalType = JournalTypeUI;
type JournalEntry = UIJournalEntry;

// keep colors/icons consistent with your preferred palette
const ACCENT_BY_TYPE: Record<JournalType, string> = {
  watering: "#4dabf7", // blue
  moisture: "#20c997", // green
  fertilising: "#ffd43b", // yellow
  care: "#e599f7", // purple
  repot: "#8B5E3C", // brown
};

const ICON_BY_TYPE: Record<JournalType, string> = {
  watering: "water",
  moisture: "spray",
  fertilising: "leaf",
  care: "flower",
  repot: "pot",
};

function formatISOToDDMMYYYY(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

type Props = {
  visible: boolean;
  plantId: string;
  plantName?: string;
  onClose: () => void;
};

export default function PlantJournalModal({
  visible,
  plantId,
  plantName,
  onClose,
}: Props) {
  // hooks always called (never conditional)
  const { t } = useTranslation();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);

  // Fetch when modal becomes visible (and plantId changes)
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!visible) return;
      if (!plantId) {
        setEntries([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const idNum = Number(plantId);
        const resp = await fetchPlantJournal(idNum, { auth: true });
        const ui = buildUIJournalEntries(resp);
        if (!cancelled) setEntries(ui);
      } catch (e: any) {
        if (!cancelled) {
          setEntries([]);
          setError(
            typeof e?.message === "string"
              ? e.message
              : "Failed to load journal."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [visible, plantId]);

  // after hooks, safe early return
  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      />

      {/* Centered glass card */}
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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {t("plantsModals.journal.title", { defaultValue: "Plant Journal" })}
          </Text>

          {plantName ? (
            <Text style={local.subTitle} numberOfLines={2}>
              {plantName}
            </Text>
          ) : null}

          {/* List */}
          <ScrollView
            style={local.list}
            contentContainerStyle={local.listContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={local.stateBox}>
                <ActivityIndicator />
                <Text style={local.stateText}>
                  {t("plantsModals.journal.loading", {
                    defaultValue: "Loading...",
                  })}
                </Text>
              </View>
            ) : error ? (
              <View style={local.stateBox}>
                <Text style={local.stateText}>
                  {t("plantsModals.journal.error", {
                    defaultValue: "Something went wrong.",
                  })}
                </Text>
              </View>
            ) : entries.length === 0 ? (
              <View style={local.stateBox}>
                <Text style={local.stateText}>
                  {t("plantsModals.journal.empty", {
                    defaultValue: "No journal entries yet.",
                  })}
                </Text>
              </View>
            ) : (
              entries.map((e) => {
                const icon = ICON_BY_TYPE[e.type];
                const accent = ACCENT_BY_TYPE[e.type];

                const typeLabel = t(`plantsModals.journal.taskTypes.${e.type}`, {
                  defaultValue: String(e.type).toUpperCase(),
                });

                const dateLabel = formatISOToDDMMYYYY(e.completedAtISO);

                return (
                  <View key={e.id} style={local.rowWrap}>
                    <View style={local.rowTop}>
                      {/* Left icon circle */}
                      <View
                        style={[local.iconCircle, { backgroundColor: accent }]}
                      >
                        <MaterialCommunityIcons
                          name={icon as any}
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>

                      {/* Center content */}
                      <View style={local.rowCenter}>
                        <View style={local.rowLine}>
                          <Text style={local.typeText} numberOfLines={1}>
                            {typeLabel}
                          </Text>
                          <Text style={local.dateText} numberOfLines={1}>
                            {dateLabel}
                          </Text>
                        </View>

                        {!!e.note && (
                          <Text style={local.noteText}>{e.note}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={s.promptButtonsRow}>
            <Pressable
              style={[s.promptBtn, s.promptPrimary]}
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
            >
              <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                {t("plantsModals.common.close", { defaultValue: "Close" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const local = StyleSheet.create({
  subTitle: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  list: {
    maxHeight: 420,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },

  stateBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    gap: 10,
  },

  stateText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },

  rowWrap: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  rowCenter: {
    flex: 1,
  },

  rowLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },

  typeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.6,
    fontSize: 13,
    flex: 1,
  },

  dateText: {
    color: "rgba(255,255,255,0.90)",
    fontWeight: "800",
    fontSize: 12,
  },

  noteText: {
    marginTop: 6,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "300",
    lineHeight: 18,
  },
});
