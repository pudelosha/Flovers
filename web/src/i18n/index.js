import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Locales
import enCommon from "../locales/en/common.json";
import enHome from "../locales/en/home.json";
import enTerms from "../locales/en/terms.json";
import enPrivacyPolicy from "../locales/en/privacy-policy.json";
import enContact from "../locales/en/contact.json";
import enFaq from "../locales/en/faq.json";
import enDocs from "../locales/en/docs.json";

import plCommon from "../locales/pl/common.json";
import plHome from "../locales/pl/home.json";
import plTerms from "../locales/pl/terms.json";
import plPrivacyPolicy from "../locales/pl/privacy-policy.json";
import plContact from "../locales/pl/contact.json";
import plFaq from "../locales/pl/faq.json";
import plDocs from "../locales/pl/docs.json";

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    terms: enTerms,
    "privacy-policy": enPrivacyPolicy,
    contact: enContact,
    faq: enFaq,
    docs: enDocs,
  },
  pl: {
    common: plCommon,
    home: plHome,
    terms: plTerms,
    "privacy-policy": plPrivacyPolicy,
    contact: plContact,
    faq: plFaq,
    docs: plDocs,
  },
};

const STORAGE_KEY = "flovers_lang";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch (_) {
    // ignore
  }
  return "pl";
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",

  ns: ["common", "home", "terms", "privacy-policy", "contact", "faq", "docs"],
  defaultNS: "common",

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch (_) {
    // ignore
  }
});

export default i18n;
