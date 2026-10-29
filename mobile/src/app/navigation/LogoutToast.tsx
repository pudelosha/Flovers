import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../providers/useAuth";
import TopSnackbar from "../../shared/ui/TopSnackbar";

// Keep this outside the signed-in navigator so it survives the switch to Login.
export default function LogoutToast() {
  const { loading, token } = useAuth();
  const { t } = useTranslation();
  const previousToken = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (previousToken.current && !token) setVisible(true);
    if (token) setVisible(false);
    previousToken.current = token;
  }, [loading, token]);
  return <TopSnackbar visible={visible}
    message={t("profile.toasts.loggedOut", { defaultValue: "You’ve been logged out." })}
    variant="success" onDismiss={() => setVisible(false)} />;
}
