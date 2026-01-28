import React from "react";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation("privacy-policy");

  return (
    <article className="card prose">
      <h1 className="h1">{t("title")}</h1>
      <p className="muted">{t("meta")}</p>

      <p>{t("intro")}</p>

      <h2 className="h2">{t("sections.admin.title")}</h2>
      <p>{t("sections.admin.text")}</p>

      <h2 className="h2">{t("sections.scope.title")}</h2>
      <p>{t("sections.scope.text")}</p>
    </article>
  );
}
