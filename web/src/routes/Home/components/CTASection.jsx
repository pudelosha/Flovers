import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";

// Google Play badges
import googlePlayEn from "../../../assets/GooglePlay_en.png";
import googlePlayPl from "../../../assets/GooglePlay_pl.png";
import googlePlayDe from "../../../assets/GooglePlay_de.png";
import googlePlayFr from "../../../assets/GooglePlay_fr.png";
import googlePlayEs from "../../../assets/GooglePlay_es.png";
import googlePlayIt from "../../../assets/GooglePlay_it.png";
import googlePlayPt from "../../../assets/GooglePlay_pt.png";
import googlePlayAr from "../../../assets/GooglePlay_ar.png";
import googlePlayHi from "../../../assets/GooglePlay_hi.png";
import googlePlayZh from "../../../assets/GooglePlay_zh.png";
import googlePlayJa from "../../../assets/GooglePlay_ja.png";
import googlePlayKo from "../../../assets/GooglePlay_ko.png";

// App Store badges
import iosStoreEn from "../../../assets/iOSStore_en.svg";
import iosStorePl from "../../../assets/iOSStore_pl.svg";
import iosStoreDe from "../../../assets/iOSStore_de.svg";
import iosStoreFr from "../../../assets/iOSStore_fr.svg";
import iosStoreEs from "../../../assets/iOSStore_es.svg";
import iosStoreIt from "../../../assets/iOSStore_it.svg";
import iosStorePt from "../../../assets/iOSStore_pt.svg";
import iosStoreAr from "../../../assets/iOSStore_ar.svg";
import iosStoreHi from "../../../assets/iOSStore_hi.svg";
import iosStoreZh from "../../../assets/iOSStore_zh.svg";
import iosStoreJa from "../../../assets/iOSStore_ja.svg";
import iosStoreKo from "../../../assets/iOSStore_ko.svg";

import "./CTASection.css";

export default function CTASection() {
  const { t, i18n } = useTranslation("home");

  const lng = (i18n.resolvedLanguage || i18n.language || "en")
    .toLowerCase()
    .split("-")[0];

  const googlePlayByLang = {
    en: googlePlayEn,
    pl: googlePlayPl,
    de: googlePlayDe,
    fr: googlePlayFr,
    es: googlePlayEs,
    it: googlePlayIt,
    pt: googlePlayPt,
    ar: googlePlayAr,
    hi: googlePlayHi,
    zh: googlePlayZh,
    ja: googlePlayJa,
    ko: googlePlayKo,
  };

  const iosStoreByLang = {
    en: iosStoreEn,
    pl: iosStorePl,
    de: iosStoreDe,
    fr: iosStoreFr,
    es: iosStoreEs,
    it: iosStoreIt,
    pt: iosStorePt,
    ar: iosStoreAr,
    hi: iosStoreHi,
    zh: iosStoreZh,
    ja: iosStoreJa,
    ko: iosStoreKo,
  };

  const googlePlayBanner = googlePlayByLang[lng] || googlePlayEn;
  const iosStoreBanner = iosStoreByLang[lng] || iosStoreEn;

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
            alt={t("store.apple.alt", {
              defaultValue: "Download on the App Store",
            })}
            loading="lazy"
          />
        </a>
      </div>
    </section>
  );
}
