import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal"; // Assuming Reveal animation component is being used

import "./MultiLanguageSection.css"; // Update with the styles provided

export default function MultiLanguageSection() {
  const { t, i18n } = useTranslation("home");

  const lng = (i18n.resolvedLanguage || i18n.language || "en")
    .toLowerCase()
    .split("-")[0];

  const title = t("multiLanguage.title", {
    defaultValue: "Multi-Language Support",
  });
  const description = t("multiLanguage.description", {
    defaultValue:
      "Flovers is available in 12 languages to help you manage your plants from anywhere in the world.",
  });

  const LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"];

  // flag-icons uses ISO country codes (GB, PL, DE, etc.)
  const flagClassFor = (code) => {
    switch (code) {
      case "en":
        return "fi fi-gb";
      case "pl":
        return "fi fi-pl";
      case "de":
        return "fi fi-de";
      case "it":
        return "fi fi-it";
      case "fr":
        return "fi fi-fr";
      case "es":
        return "fi fi-es";
      case "pt":
        return "fi fi-pt";
      case "ar":
        return "fi fi-sa";
      case "hi":
        return "fi fi-in";
      case "zh":
        return "fi fi-cn";
      case "ja":
        return "fi fi-jp";
      case "ko":
        return "fi fi-kr";
      default:
        return "";
    }
  };

  return (
    <section className="home-section multi-language-section">
      <Reveal y={16}>
        <h2 className="home-h2">{title}</h2>
        <p className="home-lead">{description}</p>
      </Reveal>

      <div className="multi-language-icons" data-lang={lng}>
        {LANGS.map((lang) => (
          <div key={lang} className="multi-language-icon-tile" title={lang.toUpperCase()}>
            <span className={flagClassFor(lang)} aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}
