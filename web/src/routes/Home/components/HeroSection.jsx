import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import phoneMock from "../../../assets/phone-reminders.png";

// Official store banners (static for now)
import googlePlayBannerEn from "../../../assets/GooglePlay_en.png";
import iosStoreBannerEn from "../../../assets/iOSStore_en.svg";

import "./HeroSection.css";

export default function HeroSection() {
  const { t, i18n } = useTranslation("home");

  const heroTitle = t("homeNew.hero.title", { defaultValue: "Flovers" });
  const heroSubtitle = t("homeNew.hero.subtitle", {
    defaultValue:
      "A plant-care system built around reminders → tasks → completion, with optional QR shortcuts and IoT readings.",
  });

  const purpose = t("homeNew.hero.purpose", {
    defaultValue:
      "Keep plant context (location, exposure, pot, soil), set sensible routines, and close tasks with notes — so the next decision is easier.",
  });

  const lang = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const googlePlayBanner = googlePlayBannerEn;
  const iosStoreBanner = iosStoreBannerEn;

  const googlePlayUrl = t("hero.cta.googlePlayUrl", { defaultValue: "" });
  const appStoreUrl = t("hero.cta.appStoreUrl", { defaultValue: "" });

  const isGooglePlayDisabled = !googlePlayUrl;
  const isAppStoreDisabled = !appStoreUrl;

  return (
    <section className="home-hero card home-hero2">
      <div className="home-hero-bg" aria-hidden="true" />

      {/* Phone overlap */}
      <div className="home-hero-phone" aria-hidden="true">
        <img src={phoneMock} alt="" className="home-hero-phone-img" loading="lazy" />
      </div>

      <div className="home-hero-inner">
        <Reveal className="home-hero-left" y={14}>
          <h1 className="home-hero-title">{heroTitle}</h1>
          <p className="home-hero-sub muted">{heroSubtitle}</p>
          <p className="home-hero-purpose">{purpose}</p>

          <div className="home-hero-stores" data-lang={lang}>
            <a
              className="home-store-badge"
              href={isGooglePlayDisabled ? undefined : googlePlayUrl}
              target={isGooglePlayDisabled ? undefined : "_blank"}
              rel={isGooglePlayDisabled ? undefined : "noreferrer"}
              aria-disabled={isGooglePlayDisabled ? "true" : "false"}
              tabIndex={isGooglePlayDisabled ? -1 : 0}
              onClick={(e) => {
                if (isGooglePlayDisabled) e.preventDefault();
              }}
            >
              <img className="home-store-badge-img" src={googlePlayBanner} alt="Get it on Google Play" />
            </a>

            <a
              className="home-store-badge"
              href={isAppStoreDisabled ? undefined : appStoreUrl}
              target={isAppStoreDisabled ? undefined : "_blank"}
              rel={isAppStoreDisabled ? undefined : "noreferrer"}
              aria-disabled={isAppStoreDisabled ? "true" : "false"}
              tabIndex={isAppStoreDisabled ? -1 : 0}
              onClick={(e) => {
                if (isAppStoreDisabled) e.preventDefault();
              }}
            >
              <img className="home-store-badge-img" src={iosStoreBanner} alt="Download on the App Store" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
