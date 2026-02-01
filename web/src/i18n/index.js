import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Locales (base)
import enCommon from "../locales/en/common.json";
import enHome from "../locales/en/home.json";
import enTerms from "../locales/en/terms.json";
import enPrivacyPolicy from "../locales/en/privacy-policy.json";
import enContact from "../locales/en/contact.json";
import enFaq from "../locales/en/faq.json";
import enDocs from "../locales/en/docs.json";
import enSchemas from "../locales/en/schemas.json";

import plCommon from "../locales/pl/common.json";
import plHome from "../locales/pl/home.json";
import plTerms from "../locales/pl/terms.json";
import plPrivacyPolicy from "../locales/pl/privacy-policy.json";
import plContact from "../locales/pl/contact.json";
import plFaq from "../locales/pl/faq.json";
import plDocs from "../locales/pl/docs.json";
import plSchemas from "../locales/pl/schemas.json";

// Locales (docs per-screen)
import enDocsOverview from "../locales/en/docs_overview.json";
import enDocsAuth from "../locales/en/docs_auth.json";
import enDocsHome from "../locales/en/docs_home.json";
import enDocsTaskHistory from "../locales/en/docs_task_history.json";
import enDocsPlants from "../locales/en/docs_plants.json";
import enDocsPlantDetails from "../locales/en/docs_plant_details.json";
import enDocsCreatePlantWizard from "../locales/en/docs_create_plant_wizard.json";
import enDocsLocations from "../locales/en/docs_locations.json";
import enDocsReminders from "../locales/en/docs_reminders.json";
import enDocsReadings from "../locales/en/docs_readings.json";
import enDocsReadingsHistory from "../locales/en/docs_readings_history.json";
import enDocsScanner from "../locales/en/docs_scanner.json";
import enDocsProfile from "../locales/en/docs_profile.json";

import plDocsOverview from "../locales/pl/docs_overview.json";
import plDocsAuth from "../locales/pl/docs_auth.json";
import plDocsHome from "../locales/pl/docs_home.json";
import plDocsTaskHistory from "../locales/pl/docs_task_history.json";
import plDocsPlants from "../locales/pl/docs_plants.json";
import plDocsPlantDetails from "../locales/pl/docs_plant_details.json";
import plDocsCreatePlantWizard from "../locales/pl/docs_create_plant_wizard.json";
import plDocsLocations from "../locales/pl/docs_locations.json";
import plDocsReminders from "../locales/pl/docs_reminders.json";
import plDocsReadings from "../locales/pl/docs_readings.json";
import plDocsReadingsHistory from "../locales/pl/docs_readings_history.json";
import plDocsScanner from "../locales/pl/docs_scanner.json";
import plDocsProfile from "../locales/pl/docs_profile.json";

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    terms: enTerms,
    "privacy-policy": enPrivacyPolicy,
    contact: enContact,
    faq: enFaq,
    docs: enDocs,
    schemas: enSchemas,

    docs_overview: enDocsOverview,
    docs_auth: enDocsAuth,
    docs_home: enDocsHome,
    docs_task_history: enDocsTaskHistory,
    docs_plants: enDocsPlants,
    docs_plant_details: enDocsPlantDetails,
    docs_create_plant_wizard: enDocsCreatePlantWizard,
    docs_locations: enDocsLocations,
    docs_reminders: enDocsReminders,
    docs_readings: enDocsReadings,
    docs_readings_history: enDocsReadingsHistory,
    docs_scanner: enDocsScanner,
    docs_profile: enDocsProfile
  },
  pl: {
    common: plCommon,
    home: plHome,
    terms: plTerms,
    "privacy-policy": plPrivacyPolicy,
    contact: plContact,
    faq: plFaq,
    docs: plDocs,
    schemas: plSchemas,

    docs_overview: plDocsOverview,
    docs_auth: plDocsAuth,
    docs_home: plDocsHome,
    docs_task_history: plDocsTaskHistory,
    docs_plants: plDocsPlants,
    docs_plant_details: plDocsPlantDetails,
    docs_create_plant_wizard: plDocsCreatePlantWizard,
    docs_locations: plDocsLocations,
    docs_reminders: plDocsReminders,
    docs_readings: plDocsReadings,
    docs_readings_history: plDocsReadingsHistory,
    docs_scanner: plDocsScanner,
    docs_profile: plDocsProfile
  }
};

const STORAGE_KEY = "flovers_lang";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch (_) {}
  return "pl";
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",

  // important: handle pl-PL etc.
  load: "languageOnly",
  supportedLngs: ["en", "pl"],

  ns: [
    "common",
    "home",
    "terms",
    "privacy-policy",
    "contact",
    "faq",
    "docs",
    "schemas",
    "docs_overview",
    "docs_auth",
    "docs_home",
    "docs_task_history",
    "docs_plants",
    "docs_plant_details",
    "docs_create_plant_wizard",
    "docs_locations",
    "docs_reminders",
    "docs_readings",
    "docs_readings_history",
    "docs_scanner",
    "docs_profile"
  ],
  defaultNS: "common",

  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch (_) {}
});

export default i18n;
