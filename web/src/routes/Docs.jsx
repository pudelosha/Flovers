import React from "react";
import { useTranslation } from "react-i18next";

export default function Docs() {
  const { t } = useTranslation("docs");

  return (
    <section className="card prose">
      <h1 className="h1">{t("title")}</h1>
      <p className="muted">{t("intro")}</p>

      <h2 className="h2">{t("links.title")}</h2>
      <ul>
        <li>{t("links.googlePlay")}</li>
        <li>{t("links.appStore")}</li>
        <li>{t("links.privacy")}</li>
        <li>{t("links.terms")}</li>
      </ul>
    </section>
  );
}
