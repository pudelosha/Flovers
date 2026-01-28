// web/src/pages/Contact.jsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TopToast from "../shared/ui/TopToast.jsx";

function withTimeout(promise, ms = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);

  const wrapped = (async () => {
    try {
      return await promise(controller.signal);
    } finally {
      clearTimeout(id);
    }
  })();

  return wrapped;
}

function isUnauthorized(err, status) {
  if (status === 401) return true;
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("unauthorized") || msg.includes("unauthorised");
}

function isTimedOut(err) {
  const name = String(err?.name ?? "");
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    name === "AbortError" ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("abort")
  );
}

export default function Contact() {
  const { t } = useTranslation(["contact", "common"]);

  const API_BASE = useMemo(
    () => (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, ""),
    []
  );

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copyToMe, setCopyToMe] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast state (RN-like)
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    variant: "default", // default | success | error
  });

  const showToast = (msg, variant = "default") => {
    setToast({ visible: true, msg, variant });
  };

  const hideToast = () => {
    setToast((t0) => ({ ...t0, visible: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const s = subject.trim();
    const m = message.trim();

    if (!s) {
      showToast(t("contact:toasts.enterSubject"), "error");
      return;
    }
    if (!m) {
      showToast(t("contact:toasts.enterMessage"), "error");
      return;
    }

    if (!API_BASE) {
      showToast(t("contact:toasts.missingApiBase"), "error");
      return;
    }

    try {
      setSaving(true);

      const url = `${API_BASE}/api/profile/support/contact/`;

      const res = await withTimeout(async (signal) => {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: s,
            message: m,
            copy_to_user: copyToMe,
          }),
          signal,
        });

        let json = null;
        try {
          json = await r.json();
        } catch {
          // ignore json parse errors
        }

        if (!r.ok) {
          const err = new Error(json?.message || `HTTP ${r.status}`);
          err.status = r.status;
          err.payload = json;
          throw err;
        }

        return json;
      }, 30000);

      showToast(res?.message || t("contact:toasts.contactSent"), "success");

      setSubject("");
      setMessage("");
      setCopyToMe(true);
    } catch (err) {
      const httpStatus = err?.status;

      if (isUnauthorized(err, httpStatus)) {
        showToast(t("contact:toasts.unauthorizedLoginAgain"), "error");
      } else if (isTimedOut(err)) {
        showToast(t("contact:toasts.requestTimedOut"), "error");
      } else {
        showToast(t("contact:toasts.couldNotSendContact"), "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      {/* Top snackbar-like toast */}
      <TopToast
        visible={toast.visible}
        message={toast.msg}
        variant={toast.variant}
        onDismiss={hideToast}
        duration={3000}
      />

      <section className="card prose">
        <h1 className="h1 h1-auth">{t("contact:title")}</h1>
        <p className="muted muted-center">{t("contact:subtitle")}</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">{t("contact:form.subjectLabel")}</label>
            <input
              className="input input-soft"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("contact:form.subjectPlaceholder")}
              disabled={saving}
            />
          </div>

          <div className="field">
            <label className="label">{t("contact:form.messageLabel")}</label>
            <textarea
              className="input input-soft textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("contact:form.messagePlaceholder")}
              disabled={saving}
            />
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={copyToMe}
              onChange={(e) => setCopyToMe(e.target.checked)}
              disabled={saving}
            />
            <span>{t("contact:form.copyToMe")}</span>
          </label>

          <div className="row">
            <button
              type="submit"
              className={"btn btn-wide" + (saving ? " btn-loading" : "")}
              disabled={saving}
            >
              {saving ? t("contact:form.sending") : t("contact:form.send")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
