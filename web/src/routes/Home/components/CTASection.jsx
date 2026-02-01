import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";

// Store badges (same assets as Hero)
import googlePlayBannerEn from "../../../assets/GooglePlay_en.png";
import googlePlayBannerPl from "../../../assets/GooglePlay_pl.png";
import iosStoreBannerEn from "../../../assets/iOSStore_en.svg";
import iosStoreBannerPl from "../../../assets/iOSStore_pl.svg";

import "./CTASection.css";

export default function CTASection() {
  const { t, i18n } = useTranslation("home");

  const lng = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const isPl = lng.startsWith("pl");

  const googlePlayBanner = isPl ? googlePlayBannerPl : googlePlayBannerEn;
  const iosStoreBanner = isPl ? iosStoreBannerPl : iosStoreBannerEn;

  const googlePlayUrl = t("hero.cta.googlePlayUrl", { defaultValue: "" });
  const appStoreUrl = t("hero.cta.appStoreUrl", { defaultValue: "" });

  const isGooglePlayDisabled = !googlePlayUrl;
  const isAppStoreDisabled = !appStoreUrl;

  return (
    <section className="home-section home-cta">
      <Reveal y={16}>
        <h2 className="home-h2">{t("homeNew.cta.title")}</h2>

        <p className="muted home-p home-lead">{t("homeNew.cta.subtitle")}</p>
      </Reveal>

      <div className="home-cta-stores" data-lang={lng}>
        <a
          className="home-cta-store"
          href={isGooglePlayDisabled ? undefined : googlePlayUrl}
          target={isGooglePlayDisabled ? undefined : "_blank"}
          rel={isGooglePlayDisabled ? undefined : "noreferrer"}
          aria-disabled={isGooglePlayDisabled ? "true" : "false"}
          tabIndex={isGooglePlayDisabled ? -1 : 0}
          onClick={(e) => {
            if (isGooglePlayDisabled) e.preventDefault();
          }}
        >
          <img
            className="home-cta-store-img"
            src={googlePlayBanner}
            alt={t("store.google.alt", { defaultValue: "Get it on Google Play" })}
            loading="lazy"
          />
        </a>

        <a
          className="home-cta-store"
          href={isAppStoreDisabled ? undefined : appStoreUrl}
          target={isAppStoreDisabled ? undefined : "_blank"}
          rel={isAppStoreDisabled ? undefined : "noreferrer"}
          aria-disabled={isAppStoreDisabled ? "true" : "false"}
          tabIndex={isAppStoreDisabled ? -1 : 0}
          onClick={(e) => {
            if (isAppStoreDisabled) e.preventDefault();
          }}
        >
          <img
            className="home-cta-store-img"
            src={iosStoreBanner}
            alt={t("store.apple.alt", { defaultValue: "Download on the App Store" })}
            loading="lazy"
          />
        </a>
      </div>
    </section>
  );
}
