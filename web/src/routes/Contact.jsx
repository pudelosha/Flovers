import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TopToast from "../shared/ui/TopToast.jsx";
import { sendPublicContact } from "../shared/contact.js";

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
  const { t, i18n } = useTranslation(["contact", "common"]);

  const API_BASE = useMemo(
    () => (import.meta.env.VITE_API_BASE || "https://api.flovers.app").replace(/\/+$/, ""),
    []
  );

  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copyToMe, setCopyToMe] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    variant: "default",
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(t("contact:toasts.enterEmail"), "error");
      return;
    }

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

      const res = await withTimeout(signal => sendPublicContact(API_BASE, {
        email: email.trim(), subject: s, message: m, copy_to_user: copyToMe,
        lang: i18n.resolvedLanguage || i18n.language || "en", website,
      }, signal), 30000);

      showToast(res?.message || t("contact:toasts.contactSent"), "success");

      setSubject("");
      setMessage("");
      setCopyToMe(true);
    } catch (err) {
      const httpStatus = err?.status;

      if (httpStatus === 429) {
        showToast(t("contact:toasts.rateLimited"), "error");
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
            <label className="label" htmlFor="contact-email">{t("contact:form.emailLabel")}</label>
            <input id="contact-email" className="input input-soft" type="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required
              placeholder={t("contact:form.emailPlaceholder")} disabled={saving} />
          </div>
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" value={website} onChange={e => setWebsite(e.target.value)}
              tabIndex={-1} autoComplete="off" maxLength={200} />
          </div>
          <div className="field">
            <label className="label">{t("contact:form.subjectLabel")}</label>
            <input
              className="input input-soft"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("contact:form.subjectPlaceholder")}
              disabled={saving}
              maxLength={200}
              required
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
              maxLength={5000}
              required
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
