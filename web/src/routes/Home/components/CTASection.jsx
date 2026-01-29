import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import StoreBadge from "./common/StoreBadge";
import phoneMock from "../../../assets/phone-reminders.png";
import "./CTASection.css";

export default function CTASection() {
  const { t } = useTranslation("home");

  return (
    <section className="home-cta card home-cta2">
      <div className="home-cta-bg" aria-hidden="true" />

      {/* Phone overlap (real image, transparent background) */}
      <div className="home-cta-phone" aria-hidden="true">
        <img src={phoneMock} alt="" className="home-cta-phone-img" loading="lazy" />
      </div>

      <Reveal y={16} className="home-cta-inner">
        <div className="home-cta-left">
          <h2 className="home-cta-title">
            {t("homeNew.cta.title", { defaultValue: "Start with one plant. Make the routine stick." })}
          </h2>

          <p className="muted home-p home-cta-sub">
            {t("homeNew.cta.subtitle", {
              defaultValue:
                "Add a plant, choose a definition, set a couple routines, and let Flovers generate tasks automatically. Adjust as you learn what works in your space.",
            })}
          </p>

          <div className="home-cta-stores">
            <StoreBadge
              platform="gp"
              kicker={t("homeNew.store.google.kicker", { defaultValue: "Get it on" })}
              main={t("hero.cta.googlePlay", { defaultValue: "Google Play" })}
              url={t("hero.cta.googlePlayUrl", { defaultValue: "" })}
            />

            <StoreBadge
              platform="ios"
              kicker={t("homeNew.store.apple.kicker", { defaultValue: "Download on the" })}
              main={t("hero.cta.appStore", { defaultValue: "iOS (coming soon)" })}
              url={t("hero.cta.appStoreUrl", { defaultValue: "" })}
              disabledText={t("homeNew.store.apple.sub", { defaultValue: "Coming soon" })}
            />
          </div>

          <div className="home-cta-foot muted">
            {t("homeNew.cta.foot", { defaultValue: "More detail is available in Documentation on this website." })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}