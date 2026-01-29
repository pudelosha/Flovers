import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import "./AppScreens.css";

function PhoneMock({ label = "Screen", variant = "a" }) {
  return (
    <div className="home-phone">
      <div className={`home-phone-screen home-phone-${variant}`} aria-hidden="true" />
      <div className="home-phone-label muted">{label}</div>
    </div>
  );
}

export default function AppScreens() {
  const { t } = useTranslation("home");

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">
          {t("homeNew.sections.screens.title", { defaultValue: "A quick look inside" })}
        </h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.screens.subtitle", {
            defaultValue: "Home shows what's due. Plant details keep context. Readings help you spot trends over time.",
          })}
        </p>
      </Reveal>

      <div className="home-phones">
        <Reveal y={20} delay={0.02}>
          <PhoneMock label={t("homeNew.sections.screens.s1", { defaultValue: "Home • due tasks" })} variant="a" />
        </Reveal>
        <Reveal y={20} delay={0.05}>
          <PhoneMock label={t("homeNew.sections.screens.s2", { defaultValue: "Plant • definition + notes" })} variant="b" />
        </Reveal>
        <Reveal y={20} delay={0.08}>
          <PhoneMock label={t("homeNew.sections.screens.s3", { defaultValue: "Readings • charts" })} variant="c" />
        </Reveal>
      </div>
    </section>
  );
}