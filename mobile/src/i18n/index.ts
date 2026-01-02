// C:\Projekty\Python\Flovers\mobile\src\i18n\index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Static imports so Metro can bundle them
import enCreatePlant from "./locales/en/createPlant.json";
import plCreatePlant from "./locales/pl/createPlant.json";

// ✅ ADD: Step-specific files (Step01)
import enCreatePlantStep01 from "./locales/en/createPlantStep01.json";
import plCreatePlantStep01 from "./locales/pl/createPlantStep01.json";

import enLogin from "./locales/en/login.json";
import plLogin from "./locales/pl/login.json";
import enRegister from "./locales/en/register.json";
import plRegister from "./locales/pl/register.json";
import enResendActivation from "./locales/en/resendActivation.json";
import plResendActivation from "./locales/pl/resendActivation.json";
import enConfirmEmail from "./locales/en/confirmEmail.json";
import plConfirmEmail from "./locales/pl/confirmEmail.json";
import enForgotPassword from "./locales/en/forgotPassword.json";
import plForgotPassword from "./locales/pl/forgotPassword.json";
import enNavigation from "./locales/en/navigation.json";
import plNavigation from "./locales/pl/navigation.json";
import enResetPassword from "./locales/en/resetPassword.json";
import plResetPassword from "./locales/pl/resetPassword.json";

// IMPORTANT:
// Only import languages that actually have files,
// OR create empty JSON files for the rest.
// (If you haven't created these files yet, comment these imports out.)
import deCreatePlant from "./locales/de/createPlant.json";
import itCreatePlant from "./locales/it/createPlant.json";
import frCreatePlant from "./locales/fr/createPlant.json";
import esCreatePlant from "./locales/es/createPlant.json";
import ptCreatePlant from "./locales/pt/createPlant.json";
import arCreatePlant from "./locales/ar/createPlant.json";
import hiCreatePlant from "./locales/hi/createPlant.json";
import zhCreatePlant from "./locales/zh/createPlant.json";
import jaCreatePlant from "./locales/ja/createPlant.json";
import koCreatePlant from "./locales/ko/createPlant.json";

export const LANGS = [
  "en",
  "pl",
  "de",
  "it",
  "fr",
  "es",
  "pt",
  "ar",
  "hi",
  "zh",
  "ja",
  "ko",
] as const;

const resources = {
  en: {
    translation: {
      // Base createPlant (common etc.)
      ...enCreatePlant,

      // ✅ ADD: Step01 strings
      ...enCreatePlantStep01,

      // Other feature bundles
      ...enLogin,
      ...enRegister,
      ...enResendActivation,
      ...enConfirmEmail,
      ...enForgotPassword,
      ...enNavigation,
      ...enResetPassword,
    },
  },
  pl: {
    translation: {
      ...plCreatePlant,

      // ✅ ADD: Step01 strings
      ...plCreatePlantStep01,

      ...plLogin,
      ...plRegister,
      ...plResendActivation,
      ...plConfirmEmail,
      ...plForgotPassword,
      ...plNavigation,
      ...plResetPassword,
    },
  },

  // NOTE: these remain as-is; if you later create step-specific files for them,
  // you must import + merge them the same way as en/pl.
  de: { translation: deCreatePlant },
  it: { translation: itCreatePlant },
  fr: { translation: frCreatePlant },
  es: { translation: esCreatePlant },
  pt: { translation: ptCreatePlant },
  ar: { translation: arCreatePlant },
  hi: { translation: hiCreatePlant },
  zh: { translation: zhCreatePlant },
  ja: { translation: jaCreatePlant },
  ko: { translation: koCreatePlant },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: resources as any,

    lng: "en",
    fallbackLng: "en",

    // default namespace used by t("...") calls
    defaultNS: "translation",
    ns: ["translation"],

    compatibilityJSON: "v3",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
