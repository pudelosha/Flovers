import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import FAB from "../../../shared/ui/FAB";
import type { FabAction } from "../../../shared/ui/FAB";
import { useSettings } from "../../../app/providers/SettingsProvider";
import GlassCard from "../../profile/components/GlassCard";
import { prompts as pr } from "../../profile/styles/profile.styles";
import ContactModalFrame from "../components/ContactModalFrame";
import SharedPlantHero from "../components/SharedPlantHero";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import type { PlantShare } from "../types/sharing.types";
import {
  PreviewNotice, SharingButton, SharingPage, sharingStyles as shared,
} from "../components/SharingUI";

type ShareFilter = "all" | "outgoing" | "incoming";

export default function SharedPlantsScreen() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { settings } = useSettings();
  const { contacts, shares, shareDraft, openSharePlant, removeShare } = useSharingPreview();
  const [filter, setFilter] = useState<ShareFilter>("all");
  const [removing, setRemoving] = useState<PlantShare | null>(null);
  const [fabCloseSignal, setFabCloseSignal] = useState(0);
  useEffect(() => {
    if (!isFocused) setRemoving(null);
    setFabCloseSignal((previous) => previous + 1);
  }, [isFocused, !!removing, !!shareDraft]);

  const contactNames = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact.name])), [contacts]);
  const groups = useMemo(() => {
    const result = new Map<string, PlantShare[]>();
    shares.filter((share) => filter === "all" || share.direction === filter).forEach((share) => {
      const key = share.direction + ":" + share.plant.id;
      result.set(key, [...(result.get(key) ?? []), share]);
    });
    return Array.from(result.values());
  }, [shares, filter]);
  const contactName = (id: string) => contactNames.get(id) ?? t("sharing.plants.unknownContact", { defaultValue: "Contact" });
  const permission = (share: PlantShare) => share.canCompleteTasks
    ? t("sharing.common.canCompleteTasks", { defaultValue: "Can complete tasks" })
    : t("sharing.common.viewOnly", { defaultValue: "View only" });
  const outgoingLabel = t("sharing.plants.outgoing", { defaultValue: "Shared by me" });
  const incomingLabel = t("sharing.plants.incoming", { defaultValue: "Shared with me" });
  const showAllAction: FabAction = {
    key: "show-all", icon: "view-list-outline", label: t("sharing.plants.showAll", { defaultValue: "Show all" }),
    onPress: () => setFilter("all"),
  };
  const actions: FabAction[] = [
    { key: "share-plants", icon: "share-variant-outline", label: t("sharing.plants.sharePlant", { defaultValue: "Share plants" }), onPress: () => openSharePlant() },
    filter === "outgoing" ? showAllAction : { key: "shared-by-me", icon: "account-arrow-right-outline", label: outgoingLabel, onPress: () => setFilter("outgoing") },
    filter === "incoming" ? showAllAction : { key: "shared-with-me", icon: "account-arrow-left-outline", label: incomingLabel, onPress: () => setFilter("incoming") },
  ];

  return (
    <View style={styles.page}>
      <SharingPage title={t("sharing.plants.title", { defaultValue: "Shared plants" })} showBack={false} extraBottomPadding={64}>
        <PreviewNotice />
        {filter !== "all" && <Text style={shared.chip}>{filter === "outgoing" ? outgoingLabel : incomingLabel}</Text>}
        {groups.length === 0 ? (
          <GlassCard>
            <MaterialCommunityIcons name="sprout-outline" color="#FFFFFF" size={30} />
            <Text style={shared.title}>{filter === "all"
              ? t("sharing.plants.emptyAllTitle", { defaultValue: "No shared plants yet" })
              : filter === "outgoing"
                ? t("sharing.plants.emptyOutgoingTitle", { defaultValue: "No plants shared yet" })
                : t("sharing.plants.emptyIncomingTitle", { defaultValue: "No plants shared with you" })}</Text>
            <Text style={shared.hint}>{filter === "all"
              ? t("sharing.plants.emptyAllBody", { defaultValue: "Share plants with a contact or ask someone to share theirs with you." })
              : filter === "outgoing"
                ? t("sharing.plants.emptyOutgoingBody", { defaultValue: "Choose plants and decide who can view them or complete their tasks." })
                : t("sharing.plants.emptyIncomingBody", { defaultValue: "Plants shared by your contacts will appear here." })}</Text>
          </GlassCard>
        ) : groups.map((group) => {
          const first = group[0];
          const plant = first.plant;
          const outgoing = first.direction === "outgoing";
          return (
            <GlassCard key={first.direction + ":" + plant.id}>
              <SharedPlantHero plant={plant} preferLocalPhoto={outgoing} />
              {group.map((share) => (
                <View key={share.id} style={styles.recipient}>
                  <View style={styles.flex}>
                    <Text style={shared.text}>{outgoing
                      ? t("sharing.plants.with", { defaultValue: "Shared with {{name}}", name: contactName(share.contactId) })
                      : t("sharing.plants.from", { defaultValue: "Shared by {{name}}", name: contactName(share.contactId) })}</Text>
                    <View style={styles.permission}>
                      <MaterialCommunityIcons name={share.canCompleteTasks ? "checkbox-marked-circle-outline" : "eye-outline"} color="#FFFFFF" size={15} />
                      <Text style={shared.hint}>{permission(share)}</Text>
                    </View>
                    <Text style={shared.hint}>{share.endsOn
                      ? t("sharing.common.until", { defaultValue: "Until {{date}}", date: share.endsOn })
                      : t("sharing.common.noEndDate", { defaultValue: "No end date" })}</Text>
                  </View>
                  <Pressable accessibilityRole="button"
                    accessibilityLabel={outgoing
                      ? t("sharing.plants.stopSharing", { defaultValue: "Remove access" }) + ": " + contactName(share.contactId)
                      : t("sharing.plants.leave", { defaultValue: "Leave shared plant" }) + ": " + plant.name}
                    style={styles.removeButton} onPress={() => setRemoving(share)}>
                    <MaterialCommunityIcons name={outgoing ? "account-minus-outline" : "logout"} size={20} color="#FF9090" />
                  </Pressable>
                </View>
              ))}
              {outgoing && <SharingButton label={t("sharing.plants.manage", { defaultValue: "Manage sharing" })}
                variant="secondary" icon="account-multiple-outline" onPress={() => openSharePlant(plant)} />}
            </GlassCard>
          );
        })}
      </SharingPage>
      {isFocused && !removing && !shareDraft && <FAB actions={actions} position={settings?.fabPosition === "left" ? "left" : "right"} closeSignal={fabCloseSignal} />}
      <ContactModalFrame visible={isFocused && removing !== null}
        title={removing?.direction === "incoming"
          ? t("sharing.plants.leaveTitle", { defaultValue: "Leave shared plant?" })
          : t("sharing.plants.removeTitle", { defaultValue: "Remove access?" })}
        onClose={() => setRemoving(null)}>
        <Text style={pr.warningText}>{removing?.direction === "incoming"
          ? t("sharing.plants.leaveBody", { defaultValue: "{{plant}} will be removed from your shared plants.", plant: removing?.plant.name ?? "" })
          : t("sharing.plants.removeBody", { defaultValue: "{{name}} will no longer have access to {{plant}}.", name: removing ? contactName(removing.contactId) : "", plant: removing?.plant.name ?? "" })}</Text>
        <View style={pr.promptButtonsRow}>
          <Pressable style={[pr.promptBtn, styles.confirmButton]} accessibilityRole="button" onPress={() => setRemoving(null)}>
            <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
          </Pressable>
          <Pressable style={[pr.promptBtn, pr.promptDanger, styles.confirmButton]} accessibilityRole="button"
            onPress={() => { if (removing) removeShare(removing.id); setRemoving(null); }}>
            <Text style={[pr.promptBtnText, pr.promptDangerText, styles.confirmText]}>{removing?.direction === "incoming"
              ? t("sharing.plants.leave", { defaultValue: "Leave shared plant" })
              : t("sharing.plants.stopSharing", { defaultValue: "Remove access" })}</Text>
          </Pressable>
        </View>
      </ContactModalFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  recipient: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  permission: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 5 },
  removeButton: { minWidth: 44, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,107,107,0.10)" },
  confirmButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  confirmText: { textAlign: "center", flexShrink: 1 },
});
