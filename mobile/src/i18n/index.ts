// C:\Projekty\Python\Flovers\mobile\src\i18n\index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Base bundles
import enCreatePlant from "./locales/en/createPlant.json";
import plCreatePlant from "./locales/pl/createPlant.json";

// Step bundles
import enCreatePlantStep01 from "./locales/en/createPlantStep01.json";
import plCreatePlantStep01 from "./locales/pl/createPlantStep01.json";
import enCreatePlantStep02 from "./locales/en/createPlantStep02.json";
import plCreatePlantStep02 from "./locales/pl/createPlantStep02.json";
import enCreatePlantStep03 from "./locales/en/createPlantStep03.json";
import plCreatePlantStep03 from "./locales/pl/createPlantStep03.json";
import enCreatePlantStep04 from "./locales/en/createPlantStep04.json";
import plCreatePlantStep04 from "./locales/pl/createPlantStep04.json";
import enCreatePlantStep05 from "./locales/en/createPlantStep05.json";
import plCreatePlantStep05 from "./locales/pl/createPlantStep05.json";
import enCreatePlantStep06 from "./locales/en/createPlantStep06.json";
import plCreatePlantStep06 from "./locales/pl/createPlantStep06.json";

// Other feature bundles
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

// Other languages unchanged
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

type AnyObj = Record<string, any>;

function stripCreatePlant(obj: AnyObj): AnyObj {
  if (!obj || typeof obj !== "object") return {};
  const { createPlant, ...rest } = obj;
  return rest;
}

function mergeCreatePlant(...objs: AnyObj[]): AnyObj {
  return {
    createPlant: objs.reduce((acc, o) => {
      const cp = o?.createPlant;
      if (cp && typeof cp === "object") return { ...acc, ...cp };
      return acc;
    }, {} as AnyObj),
  };
}

function buildTranslation(
  base: AnyObj,
  step01: AnyObj,
  step02: AnyObj,
  step03: AnyObj,
  step04: AnyObj,
  step05: AnyObj,
  step06: AnyObj,
  others: AnyObj[]
): AnyObj {
  return {
    // keep other top-level keys from each bundle
    ...stripCreatePlant(base),
    ...stripCreatePlant(step01),
    ...stripCreatePlant(step02),
    ...stripCreatePlant(step03),
    ...stripCreatePlant(step04),
    ...stripCreatePlant(step05),
    ...stripCreatePlant(step06),

    // prevent "others" from overwriting createPlant accidentally
    ...Object.assign({}, ...others.map(stripCreatePlant)),

    // deep-merge the createPlant subtree so steps don't overwrite each other
    ...mergeCreatePlant(base, step01, step02, step03, step04, step05, step06),
  };
}

const resources = {
  en: {
    translation: buildTranslation(
      enCreatePlant as AnyObj,
      enCreatePlantStep01 as AnyObj,
      enCreatePlantStep02 as AnyObj,
      enCreatePlantStep03 as AnyObj,
      enCreatePlantStep04 as AnyObj,
      enCreatePlantStep05 as AnyObj,
      enCreatePlantStep06 as AnyObj,
      [
        enLogin,
        enRegister,
        enResendActivation,
        enConfirmEmail,
        enForgotPassword,
        enNavigation,
        enResetPassword,
      ] as AnyObj[]
    ),
  },
  pl: {
    translation: buildTranslation(
      plCreatePlant as AnyObj,
      plCreatePlantStep01 as AnyObj,
      plCreatePlantStep02 as AnyObj,
      plCreatePlantStep03 as AnyObj,
      plCreatePlantStep04 as AnyObj,
      plCreatePlantStep05 as AnyObj,
      plCreatePlantStep06 as AnyObj,
      [
        plLogin,
        plRegister,
        plResendActivation,
        plConfirmEmail,
        plForgotPassword,
        plNavigation,
        plResetPassword,
      ] as AnyObj[]
    ),
  },

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
    defaultNS: "translation",
    ns: ["translation"],
    compatibilityJSON: "v3",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
