import React from "react";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation("home");

  return (
    <div className="stack">
      <section className="hero card">
        <h1 className="h1">{t("hero.title")}</h1>
        <p className="muted">{t("hero.subtitle")}</p>

        <div className="row">
          <a
            className="btn"
            href={t("hero.cta.googlePlayUrl")}
            target="_blank"
            rel="noreferrer"
          >
            {t("hero.cta.googlePlay")}
          </a>
          <a
            className="btn secondary"
            href={t("hero.cta.appStoreUrl")}
            target="_blank"
            rel="noreferrer"
          >
            {t("hero.cta.appStore")}
          </a>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2 className="h2">{t("tiles.value.title")}</h2>
          <p className="muted">{t("tiles.value.text")}</p>
        </div>

        <div className="card">
          <h2 className="h2">{t("tiles.security.title")}</h2>
          <p className="muted">{t("tiles.security.text")}</p>
        </div>

        <div className="card">
          <h2 className="h2">{t("tiles.support.title")}</h2>
          <p className="muted">{t("tiles.support.text")}</p>
        </div>
      </section>
    </div>
  );
}
