// web/src/pages/Contact.jsx
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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

  const [status, setStatus] = useState({ type: "idle", text: "" }); // idle | success | error

  const resetStatus = () => {
    if (status.type !== "idle") setStatus({ type: "idle", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    resetStatus();

    const s = subject.trim();
    const m = message.trim();

    if (!s) {
      setStatus({ type: "error", text: t("contact:toasts.enterSubject") });
      return;
    }
    if (!m) {
      setStatus({ type: "error", text: t("contact:toasts.enterMessage") });
      return;
    }

    if (!API_BASE) {
      setStatus({ type: "error", text: t("contact:toasts.missingApiBase") });
      return;
    }

    try {
      setSaving(true);

      const url = `${API_BASE}/api/profile/support/contact/`;

      const res = await withTimeout(async (signal) => {
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      setStatus({
        type: "success",
        text: res?.message || t("contact:toasts.contactSent"),
      });

      setSubject("");
      setMessage("");
      setCopyToMe(true);
    } catch (err) {
      const httpStatus = err?.status;

      if (isUnauthorized(err, httpStatus)) {
        setStatus({
          type: "error",
          text: t("contact:toasts.unauthorizedLoginAgain"),
        });
      } else if (isTimedOut(err)) {
        setStatus({ type: "error", text: t("contact:toasts.requestTimedOut") });
      } else {
        setStatus({
          type: "error",
          text: t("contact:toasts.couldNotSendContact"),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <section className="card prose">
        {/* RN-like auth title style (24px centered) */}
        <h1 className="h1 h1-auth">{t("contact:title")}</h1>
        <p className="muted muted-center">{t("contact:subtitle")}</p>

        {status.type !== "idle" ? (
          <div
            className={
              "notice " +
              (status.type === "success" ? "notice-success" : "notice-error")
            }
            role="status"
            aria-live="polite"
          >
            {status.text}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="label">{t("contact:form.subjectLabel")}</label>
            <input
              className="input input-soft"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("contact:form.subjectPlaceholder")}
              disabled={saving}
              onFocus={resetStatus}
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
              onFocus={resetStatus}
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

          {/* Single button, fixed/predictable width */}
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
