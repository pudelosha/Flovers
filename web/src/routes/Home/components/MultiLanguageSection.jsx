import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal"; // Assuming Reveal animation component is being used

// Language icons (flags)
import googlePlayBannerEn from "../../../assets/GooglePlay_en.png";
import googlePlayBannerPl from "../../../assets/GooglePlay_pl.png";
import iosStoreBannerEn from "../../../assets/iOSStore_en.svg";
import iosStoreBannerPl from "../../../assets/iOSStore_pl.svg";

import "./MultiLanguageSection.css"; // Update with the styles provided

export default function MultiLanguageSection() {
  const { t, i18n } = useTranslation("home");

  const lng = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase();
  const isPl = lng.startsWith("pl");

  const googlePlayBanner = isPl ? googlePlayBannerPl : googlePlayBannerEn;
  const iosStoreBanner = isPl ? iosStoreBannerPl : iosStoreBannerEn;

  const title = t("multiLanguage.title", { defaultValue: "Multi-Language Support" });
  const description = t("multiLanguage.description", {
    defaultValue: "Flovers is available in 12 languages to help you manage your plants from anywhere in the world."
  });

  const LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"];

  const languageFlags = {
    en: "🇬🇧",
    pl: "🇵🇱",
    de: "🇩🇪",
    it: "🇮🇹",
    fr: "🇫🇷",
    es: "🇪🇸",
    pt: "🇵🇹",
    ar: "🇸🇦",
    hi: "🇮🇳",
    zh: "🇨🇳",
    ja: "🇯🇵",
    ko: "🇰🇷"
  };

  return (
    <section className="home-section multi-language-section">
      <Reveal y={16}>
        <h2 className="home-h2">{title}</h2>
        <p className="home-lead">{description}</p>
      </Reveal>

      <div className="multi-language-icons">
        {LANGS.map((lang, index) => (
          <div key={index} className="multi-language-icon-tile">
            <span>{languageFlags[lang]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
