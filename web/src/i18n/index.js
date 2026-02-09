import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Language constants
const LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"];
const DEFAULT_LANG = "en";

// English imports
import enCommon from "../locales/en/common.json";
import enHome from "../locales/en/home.json";
import enTerms from "../locales/en/terms.json";
import enPrivacyPolicy from "../locales/en/privacy-policy.json";
import enContact from "../locales/en/contact.json";
import enFaq from "../locales/en/faq.json";
import enDocs from "../locales/en/docs.json";
import enSchemas from "../locales/en/schemas.json";
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

// Polish imports
import plCommon from "../locales/pl/common.json";
import plHome from "../locales/pl/home.json";
import plTerms from "../locales/pl/terms.json";
import plPrivacyPolicy from "../locales/pl/privacy-policy.json";
import plContact from "../locales/pl/contact.json";
import plFaq from "../locales/pl/faq.json";
import plDocs from "../locales/pl/docs.json";
import plSchemas from "../locales/pl/schemas.json";
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

// German imports
import deCommon from "../locales/de/common.json";
import deHome from "../locales/de/home.json";
import deTerms from "../locales/de/terms.json";
import dePrivacyPolicy from "../locales/de/privacy-policy.json";
import deContact from "../locales/de/contact.json";
import deFaq from "../locales/de/faq.json";
import deDocs from "../locales/de/docs.json";
import deSchemas from "../locales/de/schemas.json";
import deDocsOverview from "../locales/de/docs_overview.json";
import deDocsAuth from "../locales/de/docs_auth.json";
import deDocsHome from "../locales/de/docs_home.json";
import deDocsTaskHistory from "../locales/de/docs_task_history.json";
import deDocsPlants from "../locales/de/docs_plants.json";
import deDocsPlantDetails from "../locales/de/docs_plant_details.json";
import deDocsCreatePlantWizard from "../locales/de/docs_create_plant_wizard.json";
import deDocsLocations from "../locales/de/docs_locations.json";
import deDocsReminders from "../locales/de/docs_reminders.json";
import deDocsReadings from "../locales/de/docs_readings.json";
import deDocsReadingsHistory from "../locales/de/docs_readings_history.json";
import deDocsScanner from "../locales/de/docs_scanner.json";
import deDocsProfile from "../locales/de/docs_profile.json";

// Italian imports
import itCommon from "../locales/it/common.json";
import itHome from "../locales/it/home.json";
import itTerms from "../locales/it/terms.json";
import itPrivacyPolicy from "../locales/it/privacy-policy.json";
import itContact from "../locales/it/contact.json";
import itFaq from "../locales/it/faq.json";
import itDocs from "../locales/it/docs.json";
import itSchemas from "../locales/it/schemas.json";
import itDocsOverview from "../locales/it/docs_overview.json";
import itDocsAuth from "../locales/it/docs_auth.json";
import itDocsHome from "../locales/it/docs_home.json";
import itDocsTaskHistory from "../locales/it/docs_task_history.json";
import itDocsPlants from "../locales/it/docs_plants.json";
import itDocsPlantDetails from "../locales/it/docs_plant_details.json";
import itDocsCreatePlantWizard from "../locales/it/docs_create_plant_wizard.json";
import itDocsLocations from "../locales/it/docs_locations.json";
import itDocsReminders from "../locales/it/docs_reminders.json";
import itDocsReadings from "../locales/it/docs_readings.json";
import itDocsReadingsHistory from "../locales/it/docs_readings_history.json";
import itDocsScanner from "../locales/it/docs_scanner.json";
import itDocsProfile from "../locales/it/docs_profile.json";

// French imports
import frCommon from "../locales/fr/common.json";
import frHome from "../locales/fr/home.json";
import frTerms from "../locales/fr/terms.json";
import frPrivacyPolicy from "../locales/fr/privacy-policy.json";
import frContact from "../locales/fr/contact.json";
import frFaq from "../locales/fr/faq.json";
import frDocs from "../locales/fr/docs.json";
import frSchemas from "../locales/fr/schemas.json";
import frDocsOverview from "../locales/fr/docs_overview.json";
import frDocsAuth from "../locales/fr/docs_auth.json";
import frDocsHome from "../locales/fr/docs_home.json";
import frDocsTaskHistory from "../locales/fr/docs_task_history.json";
import frDocsPlants from "../locales/fr/docs_plants.json";
import frDocsPlantDetails from "../locales/fr/docs_plant_details.json";
import frDocsCreatePlantWizard from "../locales/fr/docs_create_plant_wizard.json";
import frDocsLocations from "../locales/fr/docs_locations.json";
import frDocsReminders from "../locales/fr/docs_reminders.json";
import frDocsReadings from "../locales/fr/docs_readings.json";
import frDocsReadingsHistory from "../locales/fr/docs_readings_history.json";
import frDocsScanner from "../locales/fr/docs_scanner.json";
import frDocsProfile from "../locales/fr/docs_profile.json";

// Spanish imports
import esCommon from "../locales/es/common.json";
import esHome from "../locales/es/home.json";
import esTerms from "../locales/es/terms.json";
import esPrivacyPolicy from "../locales/es/privacy-policy.json";
import esContact from "../locales/es/contact.json";
import esFaq from "../locales/es/faq.json";
import esDocs from "../locales/es/docs.json";
import esSchemas from "../locales/es/schemas.json";
import esDocsOverview from "../locales/es/docs_overview.json";
import esDocsAuth from "../locales/es/docs_auth.json";
import esDocsHome from "../locales/es/docs_home.json";
import esDocsTaskHistory from "../locales/es/docs_task_history.json";
import esDocsPlants from "../locales/es/docs_plants.json";
import esDocsPlantDetails from "../locales/es/docs_plant_details.json";
import esDocsCreatePlantWizard from "../locales/es/docs_create_plant_wizard.json";
import esDocsLocations from "../locales/es/docs_locations.json";
import esDocsReminders from "../locales/es/docs_reminders.json";
import esDocsReadings from "../locales/es/docs_readings.json";
import esDocsReadingsHistory from "../locales/es/docs_readings_history.json";
import esDocsScanner from "../locales/es/docs_scanner.json";
import esDocsProfile from "../locales/es/docs_profile.json";

// Portuguese imports
import ptCommon from "../locales/pt/common.json";
import ptHome from "../locales/pt/home.json";
import ptTerms from "../locales/pt/terms.json";
import ptPrivacyPolicy from "../locales/pt/privacy-policy.json";
import ptContact from "../locales/pt/contact.json";
import ptFaq from "../locales/pt/faq.json";
import ptDocs from "../locales/pt/docs.json";
import ptSchemas from "../locales/pt/schemas.json";
import ptDocsOverview from "../locales/pt/docs_overview.json";
import ptDocsAuth from "../locales/pt/docs_auth.json";
import ptDocsHome from "../locales/pt/docs_home.json";
import ptDocsTaskHistory from "../locales/pt/docs_task_history.json";
import ptDocsPlants from "../locales/pt/docs_plants.json";
import ptDocsPlantDetails from "../locales/pt/docs_plant_details.json";
import ptDocsCreatePlantWizard from "../locales/pt/docs_create_plant_wizard.json";
import ptDocsLocations from "../locales/pt/docs_locations.json";
import ptDocsReminders from "../locales/pt/docs_reminders.json";
import ptDocsReadings from "../locales/pt/docs_readings.json";
import ptDocsReadingsHistory from "../locales/pt/docs_readings_history.json";
import ptDocsScanner from "../locales/pt/docs_scanner.json";
import ptDocsProfile from "../locales/pt/docs_profile.json";

// Arabic imports
import arCommon from "../locales/ar/common.json";
import arHome from "../locales/ar/home.json";
import arTerms from "../locales/ar/terms.json";
import arPrivacyPolicy from "../locales/ar/privacy-policy.json";
import arContact from "../locales/ar/contact.json";
import arFaq from "../locales/ar/faq.json";
import arDocs from "../locales/ar/docs.json";
import arSchemas from "../locales/ar/schemas.json";
import arDocsOverview from "../locales/ar/docs_overview.json";
import arDocsAuth from "../locales/ar/docs_auth.json";
import arDocsHome from "../locales/ar/docs_home.json";
import arDocsTaskHistory from "../locales/ar/docs_task_history.json";
import arDocsPlants from "../locales/ar/docs_plants.json";
import arDocsPlantDetails from "../locales/ar/docs_plant_details.json";
import arDocsCreatePlantWizard from "../locales/ar/docs_create_plant_wizard.json";
import arDocsLocations from "../locales/ar/docs_locations.json";
import arDocsReminders from "../locales/ar/docs_reminders.json";
import arDocsReadings from "../locales/ar/docs_readings.json";
import arDocsReadingsHistory from "../locales/ar/docs_readings_history.json";
import arDocsScanner from "../locales/ar/docs_scanner.json";
import arDocsProfile from "../locales/ar/docs_profile.json";

// Hindi imports
import hiCommon from "../locales/hi/common.json";
import hiHome from "../locales/hi/home.json";
import hiTerms from "../locales/hi/terms.json";
import hiPrivacyPolicy from "../locales/hi/privacy-policy.json";
import hiContact from "../locales/hi/contact.json";
import hiFaq from "../locales/hi/faq.json";
import hiDocs from "../locales/hi/docs.json";
import hiSchemas from "../locales/hi/schemas.json";
import hiDocsOverview from "../locales/hi/docs_overview.json";
import hiDocsAuth from "../locales/hi/docs_auth.json";
import hiDocsHome from "../locales/hi/docs_home.json";
import hiDocsTaskHistory from "../locales/hi/docs_task_history.json";
import hiDocsPlants from "../locales/hi/docs_plants.json";
import hiDocsPlantDetails from "../locales/hi/docs_plant_details.json";
import hiDocsCreatePlantWizard from "../locales/hi/docs_create_plant_wizard.json";
import hiDocsLocations from "../locales/hi/docs_locations.json";
import hiDocsReminders from "../locales/hi/docs_reminders.json";
import hiDocsReadings from "../locales/hi/docs_readings.json";
import hiDocsReadingsHistory from "../locales/hi/docs_readings_history.json";
import hiDocsScanner from "../locales/hi/docs_scanner.json";
import hiDocsProfile from "../locales/hi/docs_profile.json";

// Chinese imports
import zhCommon from "../locales/zh/common.json";
import zhHome from "../locales/zh/home.json";
import zhTerms from "../locales/zh/terms.json";
import zhPrivacyPolicy from "../locales/zh/privacy-policy.json";
import zhContact from "../locales/zh/contact.json";
import zhFaq from "../locales/zh/faq.json";
import zhDocs from "../locales/zh/docs.json";
import zhSchemas from "../locales/zh/schemas.json";
import zhDocsOverview from "../locales/zh/docs_overview.json";
import zhDocsAuth from "../locales/zh/docs_auth.json";
import zhDocsHome from "../locales/zh/docs_home.json";
import zhDocsTaskHistory from "../locales/zh/docs_task_history.json";
import zhDocsPlants from "../locales/zh/docs_plants.json";
import zhDocsPlantDetails from "../locales/zh/docs_plant_details.json";
import zhDocsCreatePlantWizard from "../locales/zh/docs_create_plant_wizard.json";
import zhDocsLocations from "../locales/zh/docs_locations.json";
import zhDocsReminders from "../locales/zh/docs_reminders.json";
import zhDocsReadings from "../locales/zh/docs_readings.json";
import zhDocsReadingsHistory from "../locales/zh/docs_readings_history.json";
import zhDocsScanner from "../locales/zh/docs_scanner.json";
import zhDocsProfile from "../locales/zh/docs_profile.json";

// Japanese imports
import jaCommon from "../locales/ja/common.json";
import jaHome from "../locales/ja/home.json";
import jaTerms from "../locales/ja/terms.json";
import jaPrivacyPolicy from "../locales/ja/privacy-policy.json";
import jaContact from "../locales/ja/contact.json";
import jaFaq from "../locales/ja/faq.json";
import jaDocs from "../locales/ja/docs.json";
import jaSchemas from "../locales/ja/schemas.json";
import jaDocsOverview from "../locales/ja/docs_overview.json";
import jaDocsAuth from "../locales/ja/docs_auth.json";
import jaDocsHome from "../locales/ja/docs_home.json";
import jaDocsTaskHistory from "../locales/ja/docs_task_history.json";
import jaDocsPlants from "../locales/ja/docs_plants.json";
import jaDocsPlantDetails from "../locales/ja/docs_plant_details.json";
import jaDocsCreatePlantWizard from "../locales/ja/docs_create_plant_wizard.json";
import jaDocsLocations from "../locales/ja/docs_locations.json";
import jaDocsReminders from "../locales/ja/docs_reminders.json";
import jaDocsReadings from "../locales/ja/docs_readings.json";
import jaDocsReadingsHistory from "../locales/ja/docs_readings_history.json";
import jaDocsScanner from "../locales/ja/docs_scanner.json";
import jaDocsProfile from "../locales/ja/docs_profile.json";

// Korean imports
import koCommon from "../locales/ko/common.json";
import koHome from "../locales/ko/home.json";
import koTerms from "../locales/ko/terms.json";
import koPrivacyPolicy from "../locales/ko/privacy-policy.json";
import koContact from "../locales/ko/contact.json";
import koFaq from "../locales/ko/faq.json";
import koDocs from "../locales/ko/docs.json";
import koSchemas from "../locales/ko/schemas.json";
import koDocsOverview from "../locales/ko/docs_overview.json";
import koDocsAuth from "../locales/ko/docs_auth.json";
import koDocsHome from "../locales/ko/docs_home.json";
import koDocsTaskHistory from "../locales/ko/docs_task_history.json";
import koDocsPlants from "../locales/ko/docs_plants.json";
import koDocsPlantDetails from "../locales/ko/docs_plant_details.json";
import koDocsCreatePlantWizard from "../locales/ko/docs_create_plant_wizard.json";
import koDocsLocations from "../locales/ko/docs_locations.json";
import koDocsReminders from "../locales/ko/docs_reminders.json";
import koDocsReadings from "../locales/ko/docs_readings.json";
import koDocsReadingsHistory from "../locales/ko/docs_readings_history.json";
import koDocsScanner from "../locales/ko/docs_scanner.json";
import koDocsProfile from "../locales/ko/docs_profile.json";

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
  },
  de: {
    common: deCommon,
    home: deHome,
    terms: deTerms,
    "privacy-policy": dePrivacyPolicy,
    contact: deContact,
    faq: deFaq,
    docs: deDocs,
    schemas: deSchemas,
    docs_overview: deDocsOverview,
    docs_auth: deDocsAuth,
    docs_home: deDocsHome,
    docs_task_history: deDocsTaskHistory,
    docs_plants: deDocsPlants,
    docs_plant_details: deDocsPlantDetails,
    docs_create_plant_wizard: deDocsCreatePlantWizard,
    docs_locations: deDocsLocations,
    docs_reminders: deDocsReminders,
    docs_readings: deDocsReadings,
    docs_readings_history: deDocsReadingsHistory,
    docs_scanner: deDocsScanner,
    docs_profile: deDocsProfile
  },
  it: {
    common: itCommon,
    home: itHome,
    terms: itTerms,
    "privacy-policy": itPrivacyPolicy,
    contact: itContact,
    faq: itFaq,
    docs: itDocs,
    schemas: itSchemas,
    docs_overview: itDocsOverview,
    docs_auth: itDocsAuth,
    docs_home: itDocsHome,
    docs_task_history: itDocsTaskHistory,
    docs_plants: itDocsPlants,
    docs_plant_details: itDocsPlantDetails,
    docs_create_plant_wizard: itDocsCreatePlantWizard,
    docs_locations: itDocsLocations,
    docs_reminders: itDocsReminders,
    docs_readings: itDocsReadings,
    docs_readings_history: itDocsReadingsHistory,
    docs_scanner: itDocsScanner,
    docs_profile: itDocsProfile
  },
  fr: {
    common: frCommon,
    home: frHome,
    terms: frTerms,
    "privacy-policy": frPrivacyPolicy,
    contact: frContact,
    faq: frFaq,
    docs: frDocs,
    schemas: frSchemas,
    docs_overview: frDocsOverview,
    docs_auth: frDocsAuth,
    docs_home: frDocsHome,
    docs_task_history: frDocsTaskHistory,
    docs_plants: frDocsPlants,
    docs_plant_details: frDocsPlantDetails,
    docs_create_plant_wizard: frDocsCreatePlantWizard,
    docs_locations: frDocsLocations,
    docs_reminders: frDocsReminders,
    docs_readings: frDocsReadings,
    docs_readings_history: frDocsReadingsHistory,
    docs_scanner: frDocsScanner,
    docs_profile: frDocsProfile
  },
  es: {
    common: esCommon,
    home: esHome,
    terms: esTerms,
    "privacy-policy": esPrivacyPolicy,
    contact: esContact,
    faq: esFaq,
    docs: esDocs,
    schemas: esSchemas,
    docs_overview: esDocsOverview,
    docs_auth: esDocsAuth,
    docs_home: esDocsHome,
    docs_task_history: esDocsTaskHistory,
    docs_plants: esDocsPlants,
    docs_plant_details: esDocsPlantDetails,
    docs_create_plant_wizard: esDocsCreatePlantWizard,
    docs_locations: esDocsLocations,
    docs_reminders: esDocsReminders,
    docs_readings: esDocsReadings,
    docs_readings_history: esDocsReadingsHistory,
    docs_scanner: esDocsScanner,
    docs_profile: esDocsProfile
  },
  pt: {
    common: ptCommon,
    home: ptHome,
    terms: ptTerms,
    "privacy-policy": ptPrivacyPolicy,
    contact: ptContact,
    faq: ptFaq,
    docs: ptDocs,
    schemas: ptSchemas,
    docs_overview: ptDocsOverview,
    docs_auth: ptDocsAuth,
    docs_home: ptDocsHome,
    docs_task_history: ptDocsTaskHistory,
    docs_plants: ptDocsPlants,
    docs_plant_details: ptDocsPlantDetails,
    docs_create_plant_wizard: ptDocsCreatePlantWizard,
    docs_locations: ptDocsLocations,
    docs_reminders: ptDocsReminders,
    docs_readings: ptDocsReadings,
    docs_readings_history: ptDocsReadingsHistory,
    docs_scanner: ptDocsScanner,
    docs_profile: ptDocsProfile
  },
  ar: {
    common: arCommon,
    home: arHome,
    terms: arTerms,
    "privacy-policy": arPrivacyPolicy,
    contact: arContact,
    faq: arFaq,
    docs: arDocs,
    schemas: arSchemas,
    docs_overview: arDocsOverview,
    docs_auth: arDocsAuth,
    docs_home: arDocsHome,
    docs_task_history: arDocsTaskHistory,
    docs_plants: arDocsPlants,
    docs_plant_details: arDocsPlantDetails,
    docs_create_plant_wizard: arDocsCreatePlantWizard,
    docs_locations: arDocsLocations,
    docs_reminders: arDocsReminders,
    docs_readings: arDocsReadings,
    docs_readings_history: arDocsReadingsHistory,
    docs_scanner: arDocsScanner,
    docs_profile: arDocsProfile
  },
  hi: {
    common: hiCommon,
    home: hiHome,
    terms: hiTerms,
    "privacy-policy": hiPrivacyPolicy,
    contact: hiContact,
    faq: hiFaq,
    docs: hiDocs,
    schemas: hiSchemas,
    docs_overview: hiDocsOverview,
    docs_auth: hiDocsAuth,
    docs_home: hiDocsHome,
    docs_task_history: hiDocsTaskHistory,
    docs_plants: hiDocsPlants,
    docs_plant_details: hiDocsPlantDetails,
    docs_create_plant_wizard: hiDocsCreatePlantWizard,
    docs_locations: hiDocsLocations,
    docs_reminders: hiDocsReminders,
    docs_readings: hiDocsReadings,
    docs_readings_history: hiDocsReadingsHistory,
    docs_scanner: hiDocsScanner,
    docs_profile: hiDocsProfile
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    terms: zhTerms,
    "privacy-policy": zhPrivacyPolicy,
    contact: zhContact,
    faq: zhFaq,
    docs: zhDocs,
    schemas: zhSchemas,
    docs_overview: zhDocsOverview,
    docs_auth: zhDocsAuth,
    docs_home: zhDocsHome,
    docs_task_history: zhDocsTaskHistory,
    docs_plants: zhDocsPlants,
    docs_plant_details: zhDocsPlantDetails,
    docs_create_plant_wizard: zhDocsCreatePlantWizard,
    docs_locations: zhDocsLocations,
    docs_reminders: zhDocsReminders,
    docs_readings: zhDocsReadings,
    docs_readings_history: zhDocsReadingsHistory,
    docs_scanner: zhDocsScanner,
    docs_profile: zhDocsProfile
  },
  ja: {
    common: jaCommon,
    home: jaHome,
    terms: jaTerms,
    "privacy-policy": jaPrivacyPolicy,
    contact: jaContact,
    faq: jaFaq,
    docs: jaDocs,
    schemas: jaSchemas,
    docs_overview: jaDocsOverview,
    docs_auth: jaDocsAuth,
    docs_home: jaDocsHome,
    docs_task_history: jaDocsTaskHistory,
    docs_plants: jaDocsPlants,
    docs_plant_details: jaDocsPlantDetails,
    docs_create_plant_wizard: jaDocsCreatePlantWizard,
    docs_locations: jaDocsLocations,
    docs_reminders: jaDocsReminders,
    docs_readings: jaDocsReadings,
    docs_readings_history: jaDocsReadingsHistory,
    docs_scanner: jaDocsScanner,
    docs_profile: jaDocsProfile
  },
  ko: {
    common: koCommon,
    home: koHome,
    terms: koTerms,
    "privacy-policy": koPrivacyPolicy,
    contact: koContact,
    faq: koFaq,
    docs: koDocs,
    schemas: koSchemas,
    docs_overview: koDocsOverview,
    docs_auth: koDocsAuth,
    docs_home: koDocsHome,
    docs_task_history: koDocsTaskHistory,
    docs_plants: koDocsPlants,
    docs_plant_details: koDocsPlantDetails,
    docs_create_plant_wizard: koDocsCreatePlantWizard,
    docs_locations: koDocsLocations,
    docs_reminders: koDocsReminders,
    docs_readings: koDocsReadings,
    docs_readings_history: koDocsReadingsHistory,
    docs_scanner: koDocsScanner,
    docs_profile: koDocsProfile
  }
};

const STORAGE_KEY = "flovers_lang";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (_) {}
  return DEFAULT_LANG;
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANG,

  // important: handle pl-PL etc.
  load: "languageOnly",
  supportedLngs: LANGS,

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