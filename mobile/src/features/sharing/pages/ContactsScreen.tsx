import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useIsFocused } from "@react-navigation/native";
import { useSettings } from "../../../app/providers/SettingsProvider";
import FAB from "../../../shared/ui/FAB";
import GlassCard from "../../profile/components/GlassCard";
import AddContactModal from "../components/AddContactModal";
import ContactDetailsModal from "../components/ContactDetailsModal";
import DeleteContactModal from "../components/DeleteContactModal";
import { SharingButton, SharingPage, sharingStyles as s } from "../components/SharingUI";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import { useContacts } from "../state/ContactsProvider";
import { CONTACT_ERROR_MESSAGES } from "../types/contacts.types";
import type { ContactsMutationResult } from "../types/contacts.types";
import type { SharingContact } from "../types/sharing.types";
import { s as plantDetailStyles } from "../../plant-details/styles/plant-details.styles";

type MenuAnchor = {
  right: number;
  maxWidth: number;
  buttonTop: number;
  bottomLimit: number;
};

export default function ContactsScreen() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { settings } = useSettings();
  const { notify } = useSharingPreview();
  const { snapshot, loading, error, pending, refresh, acceptInvitation, dismissInvitation } = useContacts();
  const contacts = snapshot?.contacts ?? [];
  const invitations = snapshot?.invitations ?? [];
  const currentUser = snapshot?.currentUser;
  const [actionError, setActionError] = useState<string | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [menuHeight, setMenuHeight] = useState(72);
  const [fabCloseSignal, setFabCloseSignal] = useState(0);
  const [copied, setCopied] = useState(false);
  const pageRef = useRef<View | null>(null);
  const menuButtonRefs = useRef<Record<string, View | null>>({});
  const menuRequest = useRef(0);
  const focusedRef = useRef(isFocused);
  focusedRef.current = isFocused;
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || null;
  const deletingContact = contacts.find((contact) => contact.id === deletingContactId) || null;
  const menuContact = contacts.find((contact) => contact.id === menuOpenId) || null;

  const closeMenu = useCallback(() => {
    menuRequest.current += 1;
    setMenuOpenId(null);
    setMenuAnchor(null);
  }, []);

  const toggleMenu = (contactId: string) => {
    if (menuOpenId === contactId) {
      closeMenu();
      return;
    }
    const request = ++menuRequest.current;
    menuButtonRefs.current[contactId]?.measureInWindow((buttonX, buttonY, buttonWidth) => {
      pageRef.current?.measureInWindow((pageX, pageY, pageWidth, pageHeight) => {
        if (request !== menuRequest.current || !focusedRef.current || pageWidth <= 0 || pageHeight <= 0) return;
        const right = Math.max(12, pageWidth - (buttonX - pageX + buttonWidth) + 6);
        setMenuAnchor({
          right,
          maxWidth: Math.max(0, pageWidth - right - 12),
          buttonTop: buttonY - pageY,
          bottomLimit: pageHeight - 100,
        });
        setMenuOpenId(contactId);
      });
    });
  };

  const menuTop = menuAnchor
    ? Math.max(12, menuAnchor.buttonTop - 6 + menuHeight <= menuAnchor.bottomLimit
      ? menuAnchor.buttonTop - 6 : menuAnchor.buttonTop - menuHeight - 6)
    : 0;

  useEffect(() => setCopied(false), [currentUser?.floversId]);
  useEffect(() => {
    if (!isFocused) return;
    void refresh();
    const timer = setInterval(() => { if (focusedRef.current) void refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [isFocused, refresh]);
  const perform = async (operation: () => Promise<ContactsMutationResult>) => {
    setActionError(null);
    const result = await operation();
    if (!focusedRef.current || result.ok || result.reason === "busy" || result.reason === "staleSession") return;
    setActionError(t(`sharing.errors.${result.reason}`, { defaultValue: CONTACT_ERROR_MESSAGES[result.reason] }));
  };
  useEffect(() => () => { menuRequest.current += 1; }, []);
  useEffect(() => {
    if (!isFocused) {
      setAddVisible(false);
      setSelectedContactId(null);
      setDeletingContactId(null);
      closeMenu();
    }
  }, [isFocused, closeMenu]);
  useEffect(() => {
    if (!isFocused || addVisible || selectedContactId || deletingContactId) {
      setFabCloseSignal((value) => value + 1);
    }
  }, [isFocused, addVisible, selectedContactId, deletingContactId]);
  useEffect(() => {
    if (menuOpenId && !contacts.some((contact) => contact.id === menuOpenId)) closeMenu();
  }, [contacts, menuOpenId, closeMenu]);
  useEffect(() => {
    if (!isFocused || !menuOpenId) return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      closeMenu();
      return true;
    });
    return () => handler.remove();
  }, [isFocused, menuOpenId, closeMenu]);

  const renderIdentity = (contact: SharingContact) => (
    <View style={local.identity}>
      <View style={local.avatar}>
        <MaterialCommunityIcons name="account-outline" size={24} color="#FFFFFF" />
      </View>
      <View style={local.identityText}>
        <Text style={s.text}>{contact.name}</Text>
        {!!contact.email && <Text style={s.hint}>{contact.email}</Text>}
        {!!contact.floversId && <Text style={s.hint}>{contact.floversId}</Text>}
      </View>
    </View>
  );

  return (
    <View ref={pageRef} testID="contacts-screen" collapsable={false} style={local.page}>
      <SharingPage title={t("sharing.contacts.title", { defaultValue: "Contacts" })} showBack={false}>
        {!snapshot ? (
          loading ? <View testID="contacts-loading" style={local.loading}><CenteredSpinner /></View> :
            <GlassCard>
              <Text accessibilityRole="alert" style={s.error}>{t("sharing.contacts.loadFailed", { defaultValue: "Could not load contacts." })}</Text>
              <SharingButton label={t("sharing.contacts.retry", { defaultValue: "Try again" })} onPress={() => { void refresh(); }} />
            </GlassCard>
        ) : <>
        {!!error && <GlassCard>
          <Text accessibilityRole="alert" style={s.error}>{t(`sharing.errors.${error}`, { defaultValue: CONTACT_ERROR_MESSAGES[error] })}</Text>
          <SharingButton label={t("sharing.contacts.retry", { defaultValue: "Try again" })} onPress={() => { void refresh(); }} disabled={loading} />
        </GlassCard>}
        {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
        <GlassCard>
          <View style={local.sectionHeading}>
            <Text style={[s.title, local.headingText]}>
              {t("sharing.requests.title", { defaultValue: "Pending invitations" })}
            </Text>
            <Text style={s.chip}>{invitations.length}</Text>
          </View>
          {!invitations.length && <Text style={s.hint}>{t("sharing.requests.empty", { defaultValue: "No pending invitations" })}</Text>}
          {invitations.map((invitation, index) => (
            <View key={invitation.id} style={local.invitation}>
              {index > 0 && <View style={s.divider} />}
              <Text style={[s.chip, local.direction]}>{invitation.direction === "incoming"
                ? t("sharing.requests.incoming", { defaultValue: "Incoming" })
                : t("sharing.requests.outgoing", { defaultValue: "Sent" })}</Text>
              {renderIdentity(invitation.contact)}
              {invitation.direction === "incoming" ? (
                <View style={local.invitationActions}>
                  <SharingButton
                    style={local.actionColumn}
                    label={t("sharing.requests.accept", { defaultValue: "Accept" })}
                    icon="check"
                    disabled={!!pending}
                    onPress={() => { void perform(() => acceptInvitation(invitation.id)); }}
                  />
                  <SharingButton
                    style={local.actionColumn}
                    label={t("sharing.requests.decline", { defaultValue: "Decline" })}
                    icon="close"
                    variant="secondary"
                    disabled={!!pending}
                    onPress={() => { void perform(() => dismissInvitation(invitation.id)); }}
                  />
                </View>
              ) : (
                <SharingButton
                  label={t("sharing.requests.cancel", { defaultValue: "Cancel invitation" })}
                  variant="secondary"
                  disabled={!!pending}
                  onPress={() => { void perform(() => dismissInvitation(invitation.id)); }}
                />
              )}
            </View>
          ))}
        </GlassCard>

        <GlassCard>
          <View style={local.sectionHeading}>
            <Text style={[s.title, local.headingText]}>{t("sharing.contacts.title", { defaultValue: "Contacts" })}</Text>
            <Text style={s.chip}>{contacts.length}</Text>
          </View>
          {!contacts.length && (
            <View style={local.empty}>
              <Text style={s.text}>{t("sharing.contacts.emptyTitle", { defaultValue: "No contacts yet" })}</Text>
              <Text style={s.hint}>{t("sharing.contacts.emptyHint", { defaultValue: "Add someone you trust to start sharing your plants." })}</Text>
            </View>
          )}
          {contacts.map((contact, index) => (
            <React.Fragment key={contact.id}>
              {index > 0 && <View style={s.divider} />}
              <View style={local.contactRow}>
                {renderIdentity(contact)}
                <Pressable
                  ref={(node) => { menuButtonRefs.current[contact.id] = node; }}
                  testID={`contact-actions-${contact.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t("sharing.contacts.actions", { defaultValue: "Actions for {{name}}", name: contact.name })}
                  accessibilityState={{ expanded: menuOpenId === contact.id }}
                  onPress={() => toggleMenu(contact.id)}
                  style={local.menuButton}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="dots-horizontal" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </React.Fragment>
          ))}
        </GlassCard>

        {!!currentUser && <GlassCard>
          <Text style={s.title}>{t("sharing.contacts.yourId", { defaultValue: "Your Flovers ID" })}</Text>
          <Text selectable style={[s.text, local.ownId]}>{currentUser.floversId}</Text>
          <Text style={s.hint}>{t("sharing.contacts.realIdHint", { defaultValue: "Share this ID so others can invite you without knowing your email address." })}</Text>
          <SharingButton
            style={local.copyButton}
            label={copied
              ? t("sharing.contacts.copied", { defaultValue: "ID copied" })
              : t("sharing.contacts.copyId", { defaultValue: "Copy ID" })}
            icon={copied ? "check" : "content-copy"}
            variant="secondary"
            onPress={() => {
              try {
                Clipboard.setString(currentUser.floversId);
                setCopied(true);
                notify("idCopied");
              } catch {
                setCopied(false);
                notify("copyFailed", "error");
              }
            }}
          />
        </GlassCard>}
        </>}
      </SharingPage>
      {isFocused && !!snapshot && !addVisible && !selectedContact && !deletingContact && (
        <FAB
          position={settings.fabPosition}
          closeSignal={fabCloseSignal}
          onInteraction={closeMenu}
          actions={[{
            key: "add-contact",
            icon: "account-plus-outline",
            label: t("sharing.contacts.add", { defaultValue: "Add contact" }),
            onPress: () => { closeMenu(); setAddVisible(true); },
          }]}
        />
      )}
      {isFocused && menuContact && menuAnchor && (
        <View style={local.menuOverlay} accessibilityViewIsModal>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
            accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })} onPress={closeMenu} />
          <View testID="contact-actions-menu" style={[plantDetailStyles.menuSheet, { right: menuAnchor.right, top: menuTop, maxWidth: menuAnchor.maxWidth }]}
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              if (height > 0 && height !== menuHeight) setMenuHeight(height);
            }}>
            <Pressable accessibilityRole="button" style={plantDetailStyles.menuItem}
              accessibilityLabel={t("sharing.contacts.edit", { defaultValue: "Edit" })}
              onPress={() => { closeMenu(); setSelectedContactId(menuContact.id); }}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={plantDetailStyles.menuItemText}>{t("sharing.contacts.edit", { defaultValue: "Edit" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={plantDetailStyles.menuItem}
              accessibilityLabel={t("sharing.contacts.delete", { defaultValue: "Delete" })}
              onPress={() => { closeMenu(); setDeletingContactId(menuContact.id); }}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF6B6B" style={{ marginRight: 8 }} />
              <Text style={[plantDetailStyles.menuItemText, local.dangerText]}>{t("sharing.contacts.delete", { defaultValue: "Delete" })}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <AddContactModal visible={isFocused && addVisible} onClose={() => setAddVisible(false)} />
      <ContactDetailsModal contact={isFocused ? selectedContact : null} onClose={() => setSelectedContactId(null)} />
      <DeleteContactModal contact={isFocused ? deletingContact : null} onClose={() => setDeletingContactId(null)} />
    </View>
  );
}

const local = StyleSheet.create({
  page: { flex: 1 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  headingText: { flex: 1 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  identityText: { flex: 1, gap: 3 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(11,114,133,0.35)", alignItems: "center", justifyContent: "center" },
  direction: { alignSelf: "flex-start", marginBottom: 10 },
  invitation: { gap: 8, paddingVertical: 6 },
  invitationActions: { flexDirection: "row", gap: 8 },
  actionColumn: { flex: 1 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  menuButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 4000, elevation: 4000 },
  dangerText: { color: "#FF6B6B" },
  empty: { gap: 6, paddingVertical: 12 },
  ownId: { fontSize: 15, letterSpacing: 0.3, marginVertical: 8 },
  loading: { height: 320 },
  copyButton: { marginTop: 12 },
});
