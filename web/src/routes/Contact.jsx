import React from "react";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation("contact");

  return (
    <div className="stack">
      <section className="card">
        <h1 className="h1">{t("title")}</h1>
        <p className="muted">{t("intro")}</p>

        <div className="list">
          <div className="list-row">
            <span className="key">{t("fields.email.label")}</span>
            <span className="val">support@flovers.app</span>
          </div>

          <div className="list-row">
            <span className="key">{t("fields.responseTime.label")}</span>
            <span className="val">{t("fields.responseTime.value")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
