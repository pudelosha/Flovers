import React from "react";
import { useTranslation } from "react-i18next";

export default function Terms() {
  const { t } = useTranslation("terms");

  return (
    <article className="card prose">
      <h1 className="h1">{t("title")}</h1>
      <p className="muted">{t("meta")}</p>

      <p>{t("intro")}</p>

      <h2 className="h2">{t("sections.general.title")}</h2>
      <p>{t("sections.general.text")}</p>

      <h2 className="h2">{t("sections.account.title")}</h2>
      <p>{t("sections.account.text")}</p>
    </article>
  );
}
