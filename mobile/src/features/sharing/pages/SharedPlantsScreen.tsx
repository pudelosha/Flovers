import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import type { FabAction } from "../../../shared/ui/FAB";
import { useSettings } from "../../../app/providers/SettingsProvider";
import GlassCard from "../../profile/components/GlassCard";
import { prompts as pr } from "../../profile/styles/profile.styles";
import ContactModalFrame from "../components/ContactModalFrame";
import SharedPlantHero from "../components/SharedPlantHero";
import SharedPlantsEmptyState from "../components/SharedPlantsEmptyState";
import { s as menuStyles } from "../../plant-details/styles/plant-details.styles";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import { SHARING_ERROR_MESSAGES } from "../types/sharing.types";
import type { PlantShare, ShareablePlant } from "../types/sharing.types";
import {
  SharingButton, SharingPage, sharingStyles as shared,
} from "../components/SharingUI";

type ShareFilter = "all" | "outgoing" | "incoming";

export default function SharedPlantsScreen() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { contacts, shares, versions, shareDraft, openSharePlant, removeShare, removePlantSharing, loaded, loading, error, pending, refresh } = useSharingPreview();
  const [filter, setFilter] = useState<ShareFilter>("all");
  const [removing, setRemoving] = useState<PlantShare | null>(null);
  const [deleting, setDeleting] = useState<{ plant: ShareablePlant; expectedRevision: number } | null>(null);
  const [fabCloseSignal, setFabCloseSignal] = useState(0);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeConflict, setRemoveConflict] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ right: number; maxWidth: number; buttonTop: number; bottomLimit: number } | null>(null);
  const [menuHeight, setMenuHeight] = useState(72);
  const pageRef = useRef<View | null>(null);
  const menuButtons = useRef<Record<string, View | null>>({});
  const menuRequest = useRef(0);
  const focusedRef = useRef(isFocused);
  focusedRef.current = isFocused;
  const closeMenu = useCallback(() => {
    menuRequest.current += 1;
    setMenuId(null);
    setMenuAnchor(null);
  }, []);
  const toggleMenu = (id: string) => {
    if (menuId === id) { closeMenu(); return; }
    setFabCloseSignal((value) => value + 1);
    const request = ++menuRequest.current;
    menuButtons.current[id]?.measureInWindow((buttonX, buttonY, buttonWidth) => {
      pageRef.current?.measureInWindow((pageX, pageY, pageWidth, pageHeight) => {
        if (request !== menuRequest.current || !focusedRef.current || pageWidth <= 0 || pageHeight <= 0) return;
        const right = Math.max(12, pageWidth - (buttonX - pageX + buttonWidth) + 6);
        setMenuAnchor({ right, maxWidth: Math.max(0, pageWidth - right - 12), buttonTop: buttonY - pageY,
          bottomLimit: pageHeight - 120 - insets.bottom });
        setMenuId(id);
      });
    });
  };
  const removeTarget = useRef<string | null>(null);
  removeTarget.current = isFocused ? deleting ? `plant:${deleting.plant.id}` : removing?.id ?? null : null;
  const closeConfirmation = () => { setRemoving(null); setDeleting(null); };
  useEffect(() => {
    if (!isFocused) return;
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [isFocused, refresh]);
  useEffect(() => { setRemoveError(null); setRemoveConflict(false); }, [removing?.id, deleting?.plant.id]);
  useEffect(() => {
    if (!isFocused) { setRemoving(null); setDeleting(null); }
    setFabCloseSignal((previous) => previous + 1);
    closeMenu();
  }, [isFocused, !!removing, !!deleting, !!shareDraft, filter, closeMenu]);
  useEffect(() => () => { menuRequest.current += 1; }, []);
  useEffect(() => {
    if (!isFocused || !menuId) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => { closeMenu(); return true; });
    return () => listener.remove();
  }, [isFocused, menuId, closeMenu]);

  const contactNames = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact.name])), [contacts]);
  const groups = useMemo(() => {
    const result = new Map<string, PlantShare[]>();
    shares.filter((share) => filter === "all" || share.direction === filter).forEach((share) => {
      const key = share.direction + ":" + share.plant.id;
      result.set(key, [...(result.get(key) ?? []), share]);
    });
    return Array.from(result.values());
  }, [shares, filter]);
  const menuGroup = groups.find((group) => `${group[0].direction}:${group[0].plant.id}` === menuId);
  const menuPlant = menuGroup?.[0].plant;
  useEffect(() => { if (menuId && !menuGroup) closeMenu(); }, [menuId, menuGroup, closeMenu]);
  const menuTop = menuAnchor ? Math.max(12, menuAnchor.buttonTop - 6 + menuHeight <= menuAnchor.bottomLimit
    ? menuAnchor.buttonTop - 6 : menuAnchor.buttonTop - menuHeight - 6) : 0;
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
    <View ref={pageRef} collapsable={false} testID="shared-plants-screen" style={styles.page}>
      <SharingPage title={t("sharing.plants.title", { defaultValue: "Shared plants" })} showBack={false} extraBottomPadding={64}>
        {!loaded ? <View style={styles.loading}>
          {loading || !error ? <CenteredSpinner /> : <>
            <Text accessibilityRole="alert" style={shared.error}>{t("sharing.live.loadFailed", { defaultValue: "Could not load shared plants." })}</Text>
            <SharingButton label={t("sharing.contacts.retry", { defaultValue: "Try again" })} onPress={() => { void refresh(); }} />
          </>}
        </View> : <>
        {!!error && <GlassCard>
          <Text accessibilityRole="alert" style={shared.error}>{t(`sharing.accessErrors.${error}`, { defaultValue: SHARING_ERROR_MESSAGES[error] })}</Text>
          <SharingButton label={t("sharing.contacts.retry", { defaultValue: "Try again" })} onPress={() => { void refresh(); }} disabled={loading} />
        </GlassCard>}
        {filter !== "all" && <Text style={shared.chip}>{filter === "outgoing" ? outgoingLabel : incomingLabel}</Text>}
        {groups.length === 0 ? (
          <SharedPlantsEmptyState title={filter === "all"
              ? t("sharing.plants.emptyAllTitle", { defaultValue: "No shared plants yet" })
              : filter === "outgoing"
                ? t("sharing.plants.emptyOutgoingTitle", { defaultValue: "No plants shared yet" })
                : t("sharing.plants.emptyIncomingTitle", { defaultValue: "No plants shared with you" })}
            body={filter === "all"
              ? t("sharing.plants.emptyAllBody", { defaultValue: "Share plants with a contact or ask someone to share theirs with you." })
              : filter === "outgoing"
                ? t("sharing.plants.emptyOutgoingBody", { defaultValue: "Choose plants and decide who can view them or complete their tasks." })
                : t("sharing.plants.emptyIncomingBody", { defaultValue: "Plants shared by your contacts will appear here." })} />
        ) : groups.map((group) => {
          const first = group[0];
          const plant = first.plant;
          const outgoing = first.direction === "outgoing";
          const groupId = `${first.direction}:${plant.id}`;
          return (
            <GlassCard key={first.direction + ":" + plant.id}>
              <SharedPlantHero plant={plant} preferLocalPhoto={outgoing} expiresAt={outgoing ? undefined : first.expiresAt} action={
                <Pressable ref={(node) => { menuButtons.current[groupId] = node; }} accessibilityRole="button"
                  accessibilityLabel={t("sharing.plants.actions", { defaultValue: "Actions for {{name}}", name: plant.name })}
                  accessibilityState={{ expanded: menuId === groupId }}
                  style={styles.menuButton} hitSlop={8} onPress={() => toggleMenu(groupId)}>
                  <MaterialCommunityIcons name="dots-horizontal" size={22} color="#FFFFFF" />
                </Pressable>
              } />
              {group.map((share) => (
                <View key={share.id} style={styles.recipient}>
                  <View style={styles.flex}>
                    <View style={styles.contactRow}>
                      <MaterialCommunityIcons name={outgoing ? "account-arrow-right-outline" : "account-arrow-left-outline"} size={15} color="#BDE4F6" />
                      <Text style={styles.recipientName}>{contactName(share.contactId)}</Text>
                    </View>
                    <View style={styles.permission}>
                      <MaterialCommunityIcons name={share.canCompleteTasks ? "checkbox-marked-circle-outline" : "eye-outline"} color="#FFFFFF" size={15} />
                      <Text style={styles.metadata}>{permission(share)}</Text>
                    </View>
                    <View style={styles.permission}>
                      <MaterialCommunityIcons name="calendar-outline" color="#FFFFFF" size={15} />
                      <Text style={styles.metadata}>{share.endsOn
                        ? t("sharing.common.until", { defaultValue: "Until {{date}}", date: share.endsOn })
                        : t("sharing.common.noEndDate", { defaultValue: "No end date" })}</Text>
                    </View>
                    {!!share.isExpired && <Text style={shared.error}>{t("sharing.common.expired", { defaultValue: "Expired" })}</Text>}
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
                style={styles.manageButton} variant="secondary" icon="account-multiple-outline" onPress={() => openSharePlant(plant)} />}
            </GlassCard>
          );
        })}
        </>}
      </SharingPage>
      {isFocused && loaded && !removing && !deleting && !shareDraft && <FAB actions={actions} position={settings?.fabPosition === "left" ? "left" : "right"} closeSignal={fabCloseSignal} onInteraction={closeMenu} />}
      {isFocused && menuPlant && menuAnchor && <View style={styles.menuOverlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
          accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })} onPress={closeMenu} />
        <View testID="shared-plant-actions-menu" style={[menuStyles.menuSheet, { right: menuAnchor.right, top: menuTop, maxWidth: menuAnchor.maxWidth }]}
          onLayout={(event) => { const height = event.nativeEvent.layout.height; if (height > 0 && height !== menuHeight) setMenuHeight(height); }}>
          <Pressable accessibilityRole="button" style={menuStyles.menuItem} onPress={() => {
            const id = menuPlant.id; closeMenu(); nav.navigate("PlantDetails", { id });
          }}>
            <MaterialCommunityIcons name="flower-tulip-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={menuStyles.menuItemText}>{t("home.menu.goToPlant", { defaultValue: "Go to plant" })}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={menuStyles.menuItem} onPress={() => {
            const plantId = menuPlant.id; closeMenu(); nav.navigate("Home", { plantId, filterRequestId: `${Date.now()}-${menuRequest.current}` });
          }}>
            <MaterialCommunityIcons name="format-list-checks" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={menuStyles.menuItemText}>{t("sharing.plants.displayTasks", { defaultValue: "Display tasks" })}</Text>
          </Pressable>
          {menuGroup?.[0].direction === "outgoing" && <Pressable accessibilityRole="button" style={menuStyles.menuItem} onPress={() => {
            const plant = menuPlant;
            const expectedRevision = versions[plant.id] ?? 0;
            closeMenu();
            setDeleting({ plant, expectedRevision });
          }}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#FF9090" style={{ marginRight: 8 }} />
            <Text style={[menuStyles.menuItemText, pr.promptDangerText]}>{t("sharing.plants.deleteSharing", { defaultValue: "Delete sharing" })}</Text>
          </Pressable>}
        </View>
      </View>}
      <ContactModalFrame visible={isFocused && (removing !== null || deleting !== null)}
        title={deleting ? t("sharing.plants.deleteSharingTitle", { defaultValue: "Delete sharing?" }) : removing?.direction === "incoming"
          ? t("sharing.plants.leaveTitle", { defaultValue: "Leave shared plant?" })
          : t("sharing.plants.removeTitle", { defaultValue: "Remove access?" })}
        onClose={closeConfirmation}>
        <Text style={pr.warningText}>{deleting
          ? t("sharing.plants.deleteSharingBody", { defaultValue: "Everyone you shared {{plant}} with will lose access. Your plant and its data will be kept.", plant: deleting.plant.name })
          : removing?.direction === "incoming"
          ? t("sharing.plants.leaveBody", { defaultValue: "{{plant}} will be removed from your shared plants.", plant: removing?.plant.name ?? "" })
          : t("sharing.plants.removeBody", { defaultValue: "{{name}} will no longer have access to {{plant}}.", name: removing ? contactName(removing.contactId) : "", plant: removing?.plant.name ?? "" })}</Text>
        <View style={pr.promptButtonsRow}>
          <Pressable style={[pr.promptBtn, styles.confirmButton]} accessibilityRole="button" onPress={closeConfirmation}>
            <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
          </Pressable>
          <Pressable style={[pr.promptBtn, pr.promptDanger, styles.confirmButton, (!!pending || removeConflict) && { opacity: 0.5 }]} accessibilityRole="button" disabled={!!pending || removeConflict}
            onPress={async () => {
              if ((!removing && !deleting) || pending || removeConflict) return;
              const id = deleting ? `plant:${deleting.plant.id}` : removing!.id;
              const result = deleting
                ? await removePlantSharing(deleting.plant, deleting.expectedRevision)
                : await removeShare(removing!.id);
              if (removeTarget.current !== id) return;
              if (result.ok) closeConfirmation();
              else if (result.reason !== "busy" && result.reason !== "staleSession") {
                setRemoveConflict(!!deleting && result.reason === "conflict");
                setRemoveError(t(`sharing.accessErrors.${result.reason}`, { defaultValue: SHARING_ERROR_MESSAGES[result.reason] }));
              }
            }}>
            <Text style={[pr.promptBtnText, pr.promptDangerText, styles.confirmText]}>{deleting
              ? t("sharing.plants.deleteSharing", { defaultValue: "Delete sharing" })
              : removing?.direction === "incoming"
              ? t("sharing.plants.leave", { defaultValue: "Leave shared plant" })
              : t("sharing.plants.stopSharing", { defaultValue: "Remove access" })}</Text>
          </Pressable>
        </View>
        {!!removeError && <Text accessibilityRole="alert" style={shared.error}>{removeError}</Text>}
        {deleting && removeConflict && <SharingButton
          label={t("sharing.form.reload", { defaultValue: "Reload sharing" })} variant="secondary" disabled={loading || !!pending}
          onPress={async () => {
            const target = deleting;
            const snapshot = await refresh();
            if (removeTarget.current !== `plant:${target.plant.id}`) return;
            if (!snapshot) {
              setRemoveError(t("sharing.accessErrors.unavailable", { defaultValue: SHARING_ERROR_MESSAGES.unavailable }));
              return;
            }
            if (!snapshot.shares.some((share) => share.plant.id === target.plant.id && share.direction === "outgoing")) {
              closeConfirmation();
              return;
            }
            setDeleting({ plant: target.plant, expectedRevision: snapshot.versions[target.plant.id] ?? 0 });
            setRemoveError(null);
            setRemoveConflict(false);
          }} />}
      </ContactModalFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  manageButton: { marginTop: 12 },
  loading: { height: 300, justifyContent: "center" },
  flex: { flex: 1 },
  menuButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.24)" },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 4000, elevation: 4000 },
  recipient: { flexDirection: "row", alignItems: "center", paddingVertical: 3, gap: 10 },
  recipientName: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metadata: { color: "rgba(255,255,255,0.8)", fontSize: 11, flexShrink: 1 },
  permission: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 2 },
  removeButton: { minWidth: 44, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,107,107,0.10)" },
  confirmButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  confirmText: { textAlign: "center", flexShrink: 1 },
});
