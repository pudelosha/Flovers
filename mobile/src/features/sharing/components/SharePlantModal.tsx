import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import { controls, prompts as pr } from "../../profile/styles/profile.styles";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import { SHARING_ERROR_MESSAGES } from "../types/sharing.types";
import type { PlantShare, PlantSharingUpdate, ShareablePlant, SharingRecipient } from "../types/sharing.types";
import ContactModalFrame from "./ContactModalFrame";
import { SharingButton, sharingStyles as shared } from "./SharingUI";

type RecipientDrafts = Record<string, SharingRecipient[]>;

function localDate(value: Date) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
}

function initialRecipients(plantId: string, shares: PlantShare[], contactId?: string): SharingRecipient[] {
  const recipients = shares.filter((share) => share.plant.id === plantId && !share.isExpired).map((share) => ({
    contactId: share.contactId,
    canCompleteTasks: share.canCompleteTasks,
    endsOn: share.endsOn,
  }));
  if (contactId && !recipients.some((recipient) => recipient.contactId === contactId)) {
    recipients.push({ contactId, canCompleteTasks: false, endsOn: undefined });
  }
  return recipients;
}

export default function SharePlantModal() {
  const { t } = useTranslation();
  const { contacts, shares, shareDraft, closeSharePlant, savePlantsSharing, refresh, pending } = useSharingPreview();
  const [plants, setPlants] = useState<ShareablePlant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [editPlantId, setEditPlantId] = useState<string | null>(null);
  const lockedPlant = useRef<string | null>(null);
  const [recipientDrafts, setRecipientDrafts] = useState<RecipientDrafts>({});
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [sharingReady, setSharingReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflicted, setConflicted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateChoice, setDateChoice] = useState<{ changed: boolean; value?: string }>({ changed: false });
  const requestId = useRef(0);
  const initialized = useRef(false);
  const draftVersions = useRef<Record<string, number>>({});
  const selectedIdsRef = useRef(selectedPlantIds);
  selectedIdsRef.current = selectedPlantIds;
  const outgoingShares = useMemo(() => shares.filter((share) => share.direction === "outgoing"), [shares]);

  const loadPlants = useCallback(async (reload = false) => {
    const current = ++requestId.current;
    setLoading(true);
    setLoadFailed(false);
    try {
      const [result, snapshot] = await Promise.all([fetchPlantInstances(), refresh()]);
      if (current !== requestId.current) return;
      if (!snapshot) throw new Error("Sharing snapshot unavailable.");
      const owned = result.filter((item) => (item as typeof item & { access?: { is_owner?: boolean } }).access?.is_owner !== false);
      if (reload || !initialized.current) {
        const plantId = shareDraft?.plant?.id;
        const contactId = snapshot.contacts.some((contact) => contact.id === shareDraft?.contactId) ? shareDraft?.contactId : undefined;
        const outgoing = snapshot.shares.filter((share) => share.direction === "outgoing");
        // Determine the mode once from the opening plant and fresh server state.
        // Selecting an already shared plant in Add must not switch modes.
        if (!initialized.current) {
          lockedPlant.current = plantId && outgoing.some((share) => share.plant.id === plantId) ? plantId : null;
          setEditPlantId(lockedPlant.current);
        }
        const available = new Set([...owned.map((item) => String(item.id)), ...outgoing.map((share) => share.plant.id)]);
        const selected = (lockedPlant.current ? [lockedPlant.current] : reload ? selectedIdsRef.current : plantId ? [plantId] : []).filter((id) => available.has(id));
        setSelectedPlantIds(selected);
        setRecipientDrafts(Object.fromEntries(selected.map((id) => [id, initialRecipients(id, outgoing, contactId)])));
        draftVersions.current = { ...snapshot.versions };
        initialized.current = true;
      }
      setSharingReady(true);
      setConflicted(false);
      setSaveError(null);
      setPlants(owned.map((item) => ({
        id: String(item.id),
        name: item.display_name || item.plant_definition?.name || t("plantDetails.info.fallbackTitle", { defaultValue: "Plant #{{id}}", id: item.id }),
        location: item.location?.name,
        ...(item.plant_definition?.latin ? { latin: item.plant_definition.latin } : {}),
        ...((item.plant_definition?.image_thumb || item.plant_definition?.image)
          ? { imageUrl: item.plant_definition?.image_thumb || item.plant_definition?.image || undefined } : {}),
      })));
    } catch {
      if (current === requestId.current) setLoadFailed(true);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [t, refresh, shareDraft]);

  useEffect(() => {
    if (!shareDraft) {
      requestId.current += 1;
      return;
    }
    const plantId = shareDraft.plant?.id;
    initialized.current = false;
    lockedPlant.current = null;
    setEditPlantId(null);
    draftVersions.current = {};
    setSharingReady(false);
    setSaveError(null);
    setConflicted(false);
    setSelectedPlantIds(plantId ? [plantId] : []);
    setRecipientDrafts({});
    setDateChoice({ changed: false });
    setShowDatePicker(false);
    setPlants([]);
    void loadPlants();
    return () => { requestId.current += 1; };
    // Initialize once per new draft, keeping local edits while contacts/choices render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareDraft, loadPlants]);

  const choices = useMemo(() => {
    if (!sharingReady) return [];
    const byId = new Map<string, ShareablePlant>();
    outgoingShares.forEach((share) => byId.set(share.plant.id, share.plant));
    plants.forEach((item) => byId.set(item.id, item));
    if (shareDraft?.plant && (!sharingReady || byId.has(shareDraft.plant.id))) byId.set(shareDraft.plant.id, shareDraft.plant);
    return Array.from(byId.values());
  }, [outgoingShares, plants, shareDraft, sharingReady]);
  const selectedPlants = useMemo(() => {
    const byId = new Map(choices.map((plant) => [plant.id, plant]));
    return selectedPlantIds.map((id) => byId.get(id)).filter((plant): plant is ShareablePlant => !!plant);
  }, [choices, selectedPlantIds]);
  const managing = editPlantId !== null;
  const selectedRecipients = selectedPlantIds.flatMap((id) => recipientDrafts[id] ?? []);
  const endDates = new Set(selectedRecipients.map((recipient) => recipient.endsOn ?? ""));
  const mixedEndDates = endDates.size > 1;
  const commonEndDate = endDates.size === 1 ? Array.from(endDates)[0] || undefined : undefined;
  const displayedEndDate = selectedRecipients.length > 0 ? commonEndDate : dateChoice.value;
  const newGrantEndDate = dateChoice.changed ? dateChoice.value : commonEndDate;
  const canSave = sharingReady && !loading && !loadFailed && !pending && !conflicted && (!managing || (selectedPlantIds.length === 1 && selectedPlantIds[0] === editPlantId)) && selectedPlants.length > 0 && selectedPlants.length === selectedPlantIds.length && selectedPlants.every((plant) =>
    (recipientDrafts[plant.id]?.length ?? 0) > 0 || outgoingShares.some((share) => share.plant.id === plant.id));

  const togglePlant = (plant: ShareablePlant) => {
    if (lockedPlant.current) return;
    if (selectedPlantIds.includes(plant.id)) {
      setSelectedPlantIds((previous) => previous.filter((id) => id !== plant.id));
      return;
    }
    setRecipientDrafts((previous) => {
      if (Object.prototype.hasOwnProperty.call(previous, plant.id)) return previous;
      const preferredContact = contacts.some((contact) => contact.id === shareDraft?.contactId) ? shareDraft?.contactId : undefined;
      const initial = initialRecipients(plant.id, outgoingShares, preferredContact);
      if (dateChoice.changed && preferredContact) {
        const previouslyShared = outgoingShares.some((share) => share.plant.id === plant.id && share.contactId === preferredContact);
        if (!previouslyShared) initial.forEach((recipient) => {
          if (recipient.contactId === preferredContact) recipient.endsOn = dateChoice.value;
        });
      }
      return { ...previous, [plant.id]: initial };
    });
    setSelectedPlantIds((previous) => [...previous, plant.id]);
  };

  const toggleContact = (contactId: string) => {
    const allSelected = selectedPlantIds.length > 0 && selectedPlantIds.every((id) => (recipientDrafts[id] ?? []).some((recipient) => recipient.contactId === contactId));
    setRecipientDrafts((previous) => {
      const next = { ...previous };
      selectedPlantIds.forEach((id) => {
        const existing = previous[id] ?? [];
        next[id] = allSelected
          ? existing.filter((recipient) => recipient.contactId !== contactId)
          : existing.some((recipient) => recipient.contactId === contactId)
            ? existing
            : [...existing, { contactId, canCompleteTasks: false, endsOn: newGrantEndDate }];
      });
      return next;
    });
  };

  const setPermission = (contactId: string, canCompleteTasks: boolean) => {
    setRecipientDrafts((previous) => {
      const next = { ...previous };
      selectedPlantIds.forEach((id) => {
        next[id] = (previous[id] ?? []).map((recipient) => recipient.contactId === contactId ? { ...recipient, canCompleteTasks } : recipient);
      });
      return next;
    });
  };
  const applyEndDate = (value?: string) => {
    setDateChoice({ changed: true, value });
    setRecipientDrafts((previous) => {
      const next = { ...previous };
      selectedPlantIds.forEach((id) => {
        next[id] = (previous[id] ?? []).map((recipient) => ({ ...recipient, endsOn: value }));
      });
      return next;
    });
  };

  const save = async () => {
    if (!canSave) return;
    const current = requestId.current;
    setSaveError(null);
    const updates: PlantSharingUpdate[] = selectedPlants.map((plant) => ({ plant, recipients: recipientDrafts[plant.id] ?? [], expectedRevision: draftVersions.current[plant.id] ?? 0 }));
    const result = await savePlantsSharing(updates);
    if (current !== requestId.current) return;
    if (result.ok) closeSharePlant();
    else if (result.reason !== "busy" && result.reason !== "staleSession") {
      setConflicted(result.reason === "conflict" || result.reason === "notContact");
      setSaveError(t(`sharing.accessErrors.${result.reason}`, { defaultValue: SHARING_ERROR_MESSAGES[result.reason] }));
    }
  };

  return (
    <ContactModalFrame
      sharingLayout
      visible={shareDraft !== null}
      title={managing ? t("sharing.form.manageTitle", { defaultValue: "Manage sharing" }) : t("sharing.form.title", { defaultValue: "Share plants" })}
      onClose={closeSharePlant}
    >
      <View style={styles.content}>
        <Text style={shared.hint}>{managing
          ? t("sharing.form.editHint", { defaultValue: "Manage contacts, permissions and the end date for this plant. To share other plants, use Share plants." })
          : t("sharing.form.multiPlantHint", { defaultValue: "Choose the plants and contacts to share them with." })}</Text>
        <Text style={shared.title}>{managing
          ? t("sharing.form.lockedPlant", { defaultValue: "Plant (locked)" })
          : t("sharing.form.choosePlants", { defaultValue: "Choose plants" })}</Text>
        {!managing && <Text style={shared.hint}>{t("sharing.form.plantsSelected", { defaultValue: "Plants selected: {{count}}", count: selectedPlantIds.length })}</Text>}
        {loading && <View style={styles.spinner}><CenteredSpinner size={32} color="#FFFFFF" /></View>}
        {loadFailed && <View style={styles.section}>
          <Text style={shared.error}>{t("sharing.form.loadFailed", { defaultValue: "Could not load your plants." })}</Text>
          <SharingButton label={t("sharing.form.retry", { defaultValue: "Try again" })} variant="secondary" onPress={() => void loadPlants(conflicted)} />
        </View>}
        {!loading && !loadFailed && choices.length === 0 && <Text style={shared.hint}>{t("sharing.form.noPlants", { defaultValue: "No plants available. Add a plant to start sharing." })}</Text>}
        {(managing ? choices.filter((plant) => plant.id === editPlantId) : choices).map((plant) => {
          const selected = selectedPlantIds.includes(plant.id);
          return (
            <Pressable key={plant.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: managing || !sharingReady || !!pending }}
              accessibilityLabel={t("sharing.form.selectPlant", { defaultValue: "Select {{name}}", name: plant.name })}
              disabled={managing || !sharingReady || !!pending} style={[styles.choice, selected && styles.selected]} onPress={() => togglePlant(plant)}>
              <MaterialCommunityIcons name={managing ? "lock-outline" : selected ? "checkbox-marked-outline" : "checkbox-blank-outline"} size={22} color="#FFFFFF" />
              <View style={styles.flex}><Text style={shared.text}>{plant.name}</Text>{!!plant.location && <Text style={shared.hint}>{plant.location}</Text>}</View>
            </Pressable>
          );
        })}

        <Text style={shared.title}>{t("sharing.form.contacts", { defaultValue: "Who can access these plants?" })}</Text>
        <Text style={shared.hint}>{t("sharing.form.permissionHint", { defaultValue: "View only unless task completion is enabled." })}</Text>
        {contacts.length === 0 && <Text style={shared.hint}>{t("sharing.form.noContacts", { defaultValue: "Add and accept a contact before sharing a plant." })}</Text>}
        {contacts.map((contact) => {
          const access = selectedPlantIds.map((id) => (recipientDrafts[id] ?? []).find((recipient) => recipient.contactId === contact.id));
          const grants = access.filter((recipient): recipient is SharingRecipient => !!recipient);
          const allSelected = selectedPlantIds.length > 0 && grants.length === selectedPlantIds.length;
          const mixedAccess = grants.length > 0 && !allSelected;
          const mixedPermissions = grants.some((recipient) => recipient.canCompleteTasks) && grants.some((recipient) => !recipient.canCompleteTasks);
          return (
            <View key={contact.id} style={[styles.contact, grants.length > 0 && styles.selected]}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: mixedAccess ? "mixed" : allSelected, disabled: selectedPlantIds.length === 0 }}
                accessibilityLabel={t("sharing.form.selectContact", { defaultValue: "Select {{name}}", name: contact.name })}
                style={[styles.contactHeader, selectedPlantIds.length === 0 && styles.disabled]} disabled={selectedPlantIds.length === 0 || !sharingReady || !!pending}
                onPress={() => toggleContact(contact.id)}>
                <MaterialCommunityIcons name={mixedAccess ? "minus-box-outline" : allSelected ? "checkbox-marked-outline" : "checkbox-blank-outline"} size={22} color="#FFFFFF" />
                <View style={styles.flex}><Text style={shared.text}>{contact.name}</Text><Text style={shared.hint}>{contact.email || contact.floversId}</Text></View>
              </Pressable>
              {mixedAccess && <Text style={styles.contactHint}>{t("sharing.form.mixedAccess", { defaultValue: "Has access to some selected plants. Select to add the rest." })}</Text>}
              {grants.length > 0 && <View style={styles.permissions}>
                <Text style={shared.text}>{t("sharing.form.completeLabel", { defaultValue: "Allow completing tasks" })}</Text>
                {mixedPermissions && <Text style={shared.hint}>{t("sharing.form.mixedPermissions", { defaultValue: "Permissions differ between the selected plants." })}</Text>}
                <View style={styles.permissionOptions}>
                  {([false, true] as const).map((allowed) => {
                    const checked = !mixedPermissions && grants.every((recipient) => recipient.canCompleteTasks === allowed);
                    const label = allowed
                      ? t("sharing.common.canCompleteTasks", { defaultValue: "Can complete tasks" })
                      : t("sharing.common.viewOnly", { defaultValue: "View only" });
                    return <Pressable key={String(allowed)} accessibilityRole="radio" accessibilityState={{ checked }}
                      accessibilityLabel={contact.name + ": " + label} style={[styles.permissionOption, checked && styles.permissionSelected]}
                      disabled={!!pending} onPress={() => setPermission(contact.id, allowed)}>
                      <MaterialCommunityIcons name={checked ? "radiobox-marked" : "radiobox-blank"} size={18} color="#FFFFFF" />
                      <Text style={styles.permissionText}>{label}</Text>
                    </Pressable>;
                  })}
                </View>
              </View>}
            </View>
          );
        })}

        <Text style={shared.title}>{t("sharing.form.endDate", { defaultValue: "End date" })}</Text>
        <Text style={shared.hint}>{t("sharing.form.endDateHint", { defaultValue: "An optional end date for the selected contacts and plants." })}</Text>
        {mixedEndDates && <Text style={shared.hint}>{t("sharing.form.endDatesVary", { defaultValue: "End dates differ between the selected plants." })}</Text>}
        <Pressable style={[controls.actionBtnFull, styles.dateButton]} disabled={selectedPlantIds.length === 0 || !sharingReady || !!pending}
          accessibilityRole="button" accessibilityState={{ disabled: selectedPlantIds.length === 0 }} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar-outline" size={18} color="#FFFFFF" />
          <Text style={[controls.actionBtnFullText, styles.dateText]}>{displayedEndDate
            ? t("sharing.common.until", { defaultValue: "Until {{date}}", date: displayedEndDate })
            : t("sharing.form.chooseDate", { defaultValue: "Choose a date" })}</Text>
        </Pressable>
        {(mixedEndDates || !!displayedEndDate) && <SharingButton label={t("sharing.form.clearDate", { defaultValue: "No end date" })} variant="secondary"
          onPress={() => { setShowDatePicker(false); applyEndDate(undefined); }} />}
        {showDatePicker && <View>
          <DateTimePicker value={displayedEndDate ? new Date(displayedEndDate + "T12:00:00") : new Date()} mode="date"
            minimumDate={new Date(new Date().setHours(0, 0, 0, 0))} display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor="#FFFFFF" themeVariant="dark" onChange={(event, date) => {
              if (Platform.OS !== "ios") setShowDatePicker(false);
              if (event.type === "set" && date) applyEndDate(localDate(date));
            }} />
          {Platform.OS === "ios" && <SharingButton label={t("sharing.form.done", { defaultValue: "Done" })} variant="secondary" onPress={() => setShowDatePicker(false)} />}
        </View>}
      </View>
      {!!saveError && <Text accessibilityRole="alert" style={[shared.error, styles.content]}>{saveError}</Text>}
      {conflicted && <View style={styles.content}>
        <Text style={shared.hint}>{t("sharing.form.conflictHint", { defaultValue: "Reloading sharing replaces your current recipient selections with the latest saved permissions." })}</Text>
        <SharingButton label={t("sharing.form.reload", { defaultValue: "Reload sharing" })} variant="secondary" disabled={loading || !!pending} onPress={() => { void loadPlants(true); }} />
      </View>}

      <View style={pr.promptButtonsRow}>
        <Pressable style={[pr.promptBtn, styles.footerButton]} accessibilityRole="button" onPress={closeSharePlant}>
          <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
        </Pressable>
        <Pressable style={[pr.promptBtn, pr.promptPrimary, styles.footerButton, !canSave && styles.disabled]} disabled={!canSave}
          accessibilityRole="button" accessibilityState={{ disabled: !canSave }} onPress={save}>
          <Text style={[pr.promptBtnText, pr.promptPrimaryText, styles.footerText]}>{managing
            ? t("sharing.form.save", { defaultValue: "Save sharing" })
            : t("sharing.form.shareSelected", { defaultValue: "Share selected plants" })}</Text>
        </Pressable>
      </View>
    </ContactModalFrame>
  );
}

const styles = StyleSheet.create({
  content: { marginHorizontal: 16, gap: 12, marginBottom: 14 },
  flex: { flex: 1 },
  section: { gap: 8 },
  spinner: { height: 56 },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)" },
  selected: { backgroundColor: "rgba(11,114,133,0.32)" },
  contact: { borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  contactHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  contactHint: { color: "rgba(255,255,255,0.78)", fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingBottom: 10 },
  permissions: { gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  permissionOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  permissionOption: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 100, paddingHorizontal: 9, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  permissionSelected: { backgroundColor: "rgba(11,114,133,0.55)" },
  permissionText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", flexShrink: 1 },
  dateButton: { marginBottom: 0 },
  dateText: { color: "#FFFFFF", flexShrink: 1 },
  footerButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  footerText: { textAlign: "center", flexShrink: 1 },
  disabled: { opacity: 0.45 },
});
