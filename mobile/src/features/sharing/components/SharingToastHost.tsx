import React from "react";
import { useTranslation } from "react-i18next";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import type { SharingToastKind } from "../types/sharing.types";

export const SHARING_TOAST_MESSAGES: Record<SharingToastKind, string> = {
  invitationAdded: "Invitation added to the preview.",
  invitationAccepted: "Contact added in this preview.",
  invitationDeclined: "Invitation declined in this preview.",
  invitationCancelled: "Invitation cancelled in this preview.",
  contactUpdated: "Contact updated in this preview.",
  contactDeleted: "Contact deleted in this preview.",
  sharingSaved: "Sharing updated.",
  accessRemoved: "Access removed.",
  plantLeft: "Shared plant removed.",
  idCopied: "ID copied.",
  copyFailed: "Could not copy the ID.",
  previewReset: "Preview reset.",
  contactsInvitationAdded: "Invitation sent.",
  contactsInvitationAccepted: "Contact added.",
  contactsInvitationDeclined: "Invitation declined.",
  contactsInvitationCancelled: "Invitation cancelled.",
  contactsContactUpdated: "Contact name updated.",
  contactsContactDeleted: "Contact deleted.",
};

export default function SharingToastHost() {
  const { t } = useTranslation();
  const { toast, dismissToast } = useSharingPreview();
  if (!toast) return null;
  return <TopSnackbar key={toast.id} visible message={t(`sharing.toasts.${toast.kind}`, { defaultValue: SHARING_TOAST_MESSAGES[toast.kind] })}
    variant={toast.variant} onDismiss={() => dismissToast(toast.id)} />;
}
