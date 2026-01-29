import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import Badge from "./common/Badge";
import Stat from "./common/Stat";
import StoreButtons from "./common/StoreButtons";
import "./HeroSection.css";

export default function HeroSection() {
  const { t } = useTranslation("home");

  const heroTitle = t("homeNew.hero.title", { defaultValue: "Flovers" });
  const heroSubtitle = t("homeNew.hero.subtitle", {
    defaultValue: "A plant-care system built around reminders → tasks → completion, with optional QR shortcuts and IoT readings.",
  });

  const purpose = t("homeNew.hero.purpose", {
    defaultValue:
      "Keep plant context (location, exposure, pot, soil), set sensible routines, and close tasks with notes — so the next decision is easier.",
  });

  return (
    <section className="home-hero card">
      <div className="home-hero-bg" aria-hidden="true" />
      <div className="home-hero-inner">
        <Reveal className="home-hero-left" y={14}>
          <Badge>{t("homeNew.hero.badge", { defaultValue: "Plant care • Routines • QR • IoT" })}</Badge>

          <h1 className="home-hero-title">{heroTitle}</h1>
          <p className="home-hero-sub muted">{heroSubtitle}</p>
          <p className="home-hero-purpose">{purpose}</p>

          <StoreButtons t={t} />

          <div className="home-hero-meta muted">
            <span>{t("homeNew.hero.meta.android", { defaultValue: "Android available" })}</span>
            <span className="home-dot">•</span>
            <span>{t("homeNew.hero.meta.ios", { defaultValue: "iOS coming soon" })}</span>
            <span className="home-dot">•</span>
            <span>{t("homeNew.hero.meta.docs", { defaultValue: "Docs, privacy & support on web" })}</span>
          </div>
        </Reveal>

        <Reveal className="home-hero-right" delay={0.06} y={14}>
          <div className="home-hero-panel">
            <div className="home-hero-panel-title">
              {t("homeNew.hero.panelTitle", { defaultValue: "What Flovers helps you do" })}
            </div>

            <div className="home-hero-bullets">
              <div className="home-bullet">
                <span className="home-bullet-dot" />
                <span>{t("homeNew.hero.b1", { defaultValue: "Turn routines into tasks you can finish." })}</span>
              </div>
              <div className="home-bullet">
                <span className="home-bullet-dot" />
                <span>{t("homeNew.hero.b2", { defaultValue: "Use plant definitions to choose better intervals." })}</span>
              </div>
              <div className="home-bullet">
                <span className="home-bullet-dot" />
                <span>{t("homeNew.hero.b3", { defaultValue: "Scan QR to jump straight to the right plant." })}</span>
              </div>
              <div className="home-bullet">
                <span className="home-bullet-dot" />
                <span>{t("homeNew.hero.b4", { defaultValue: "Optional sensors to confirm trends, not guess." })}</span>
              </div>
              <div className="home-bullet">
                <span className="home-bullet-dot" />
                <span>
                  {t("homeNew.hero.b5", { defaultValue: "Get email or push notifications when tasks are due." })}
                </span>
              </div>
            </div>

            {/* sticks to bottom of panel */}
            <div className="home-stats">
              <Stat
                value={t("homeNew.hero.stat1.value", { defaultValue: "Tasks" })}
                label={t("homeNew.hero.stat1.label", { defaultValue: "generated from routines" })}
              />
              <Stat
                value={t("homeNew.hero.stat2.value", { defaultValue: "QR" })}
                label={t("homeNew.hero.stat2.label", { defaultValue: "scan to open plant" })}
              />
              <Stat
                value={t("homeNew.hero.stat3.value", { defaultValue: "IoT" })}
                label={t("homeNew.hero.stat3.label", { defaultValue: "day/week/month charts" })}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}