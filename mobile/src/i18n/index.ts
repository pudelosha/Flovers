import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Base bundles
import enCreatePlant from "./locales/en/createPlant.json";
import plCreatePlant from "./locales/pl/createPlant.json";
import deCreatePlant from "./locales/de/createPlant.json";

// Step bundles
import enCreatePlantStep01 from "./locales/en/createPlantStep01.json";
import plCreatePlantStep01 from "./locales/pl/createPlantStep01.json";
import deCreatePlantStep01 from "./locales/de/createPlantStep01.json";

import enCreatePlantStep02 from "./locales/en/createPlantStep02.json";
import plCreatePlantStep02 from "./locales/pl/createPlantStep02.json";
import deCreatePlantStep02 from "./locales/de/createPlantStep02.json";

import enCreatePlantStep03 from "./locales/en/createPlantStep03.json";
import plCreatePlantStep03 from "./locales/pl/createPlantStep03.json";
import deCreatePlantStep03 from "./locales/de/createPlantStep03.json";

import enCreatePlantStep04 from "./locales/en/createPlantStep04.json";
import plCreatePlantStep04 from "./locales/pl/createPlantStep04.json";
import deCreatePlantStep04 from "./locales/de/createPlantStep04.json";

import enCreatePlantStep05 from "./locales/en/createPlantStep05.json";
import plCreatePlantStep05 from "./locales/pl/createPlantStep05.json";
import deCreatePlantStep05 from "./locales/de/createPlantStep05.json";

import enCreatePlantStep06 from "./locales/en/createPlantStep06.json";
import plCreatePlantStep06 from "./locales/pl/createPlantStep06.json";
import deCreatePlantStep06 from "./locales/de/createPlantStep06.json";

import enCreatePlantStep07 from "./locales/en/createPlantStep07.json";
import plCreatePlantStep07 from "./locales/pl/createPlantStep07.json";
import deCreatePlantStep07 from "./locales/de/createPlantStep07.json";

import enCreatePlantStep08 from "./locales/en/createPlantStep08.json";
import plCreatePlantStep08 from "./locales/pl/createPlantStep08.json";
import deCreatePlantStep08 from "./locales/de/createPlantStep08.json";

import enCreatePlantStep09 from "./locales/en/createPlantStep09.json";
import plCreatePlantStep09 from "./locales/pl/createPlantStep09.json";
import deCreatePlantStep09 from "./locales/de/createPlantStep09.json";

// Other feature bundles
import enLogin from "./locales/en/login.json";
import plLogin from "./locales/pl/login.json";
import deLogin from "./locales/de/login.json";

import enRegister from "./locales/en/register.json";
import plRegister from "./locales/pl/register.json";
import deRegister from "./locales/de/register.json";

import enRegisterSuccess from "./locales/en/registerSuccess.json";
import plRegisterSuccess from "./locales/pl/registerSuccess.json";
import deRegisterSuccess from "./locales/de/registerSuccess.json";

import enResendActivation from "./locales/en/resendActivation.json";
import plResendActivation from "./locales/pl/resendActivation.json";
import deResendActivation from "./locales/de/resendActivation.json";

import enConfirmEmail from "./locales/en/confirmEmail.json";
import plConfirmEmail from "./locales/pl/confirmEmail.json";
import deConfirmEmail from "./locales/de/confirmEmail.json";

import enForgotPassword from "./locales/en/forgotPassword.json";
import plForgotPassword from "./locales/pl/forgotPassword.json";
import deForgotPassword from "./locales/de/forgotPassword.json";

import enNavigation from "./locales/en/navigation.json";
import plNavigation from "./locales/pl/navigation.json";
import deNavigation from "./locales/de/navigation.json";

import enResetPassword from "./locales/en/resetPassword.json";
import plResetPassword from "./locales/pl/resetPassword.json";
import deResetPassword from "./locales/de/resetPassword.json";

// Languages bundle
import enLanguages from "./locales/en/languages.json";
import plLanguages from "./locales/pl/languages.json";
import deLanguages from "./locales/de/languages.json";

// Scanner bundles
import enScanner from "./locales/en/scanner.json";
import plScanner from "./locales/pl/scanner.json";
import deScanner from "./locales/de/scanner.json";

// Plants bundles
import enPlants from "./locales/en/plants.json";
import plPlants from "./locales/pl/plants.json";
import dePlants from "./locales/de/plants.json";

// Plants modals bundles
import enPlantsModals from "./locales/en/plantsModals.json";
import plPlantsModals from "./locales/pl/plantsModals.json";
import dePlantsModals from "./locales/de/plantsModals.json";

// Locations bundles
import enLocations from "./locales/en/locations.json";
import plLocations from "./locales/pl/locations.json";
import deLocations from "./locales/de/locations.json";

// Locations modals bundles
import enLocationsModals from "./locales/en/locationsModals.json";
import plLocationsModals from "./locales/pl/locationsModals.json";
import deLocationsModals from "./locales/de/locationsModals.json";

// Plant Details bundles
import enPlantDetails from "./locales/en/plantDetails.json";
import plPlantDetails from "./locales/pl/plantDetails.json";
import dePlantDetails from "./locales/de/plantDetails.json";

import enPlantDetailsModals from "./locales/en/plantDetailsModals.json";
import plPlantDetailsModals from "./locales/pl/plantDetailsModals.json";
import dePlantDetailsModals from "./locales/de/plantDetailsModals.json";

// Reminders bundles
import enReminders from "./locales/en/reminders.json";
import plReminders from "./locales/pl/reminders.json";
import deReminders from "./locales/de/reminders.json";

// Reminders modals bundles
import enRemindersModals from "./locales/en/remindersModals.json";
import plRemindersModals from "./locales/pl/remindersModals.json";
import deRemindersModals from "./locales/de/remindersModals.json";

// Readings bundles
import enReadings from "./locales/en/readings.json";
import plReadings from "./locales/pl/readings.json";
import deReadings from "./locales/de/readings.json";

// Readings modals bundles
import enReadingsModals from "./locales/en/readingsModals.json";
import plReadingsModals from "./locales/pl/readingsModals.json";
import deReadingsModals from "./locales/de/readingsModals.json";

// Readings history bundles
import enReadingsHistory from "./locales/en/readingsHistory.json";
import plReadingsHistory from "./locales/pl/readingsHistory.json";
import deReadingsHistory from "./locales/de/readingsHistory.json";

// Profile bundles
import enProfile from "./locales/en/profile.json";
import plProfile from "./locales/pl/profile.json";
import deProfile from "./locales/de/profile.json";

import enProfileModals from "./locales/en/profileModals.json";
import plProfileModals from "./locales/pl/profileModals.json";
import deProfileModals from "./locales/de/profileModals.json";

// Home bundles
import enHome from "./locales/en/home.json";
import plHome from "./locales/pl/home.json";
import deHome from "./locales/de/home.json";

// Home modals bundles
import enHomeModals from "./locales/en/homeModals.json";
import plHomeModals from "./locales/pl/homeModals.json";
import deHomeModals from "./locales/de/homeModals.json";

// Task history bundles
import enTaskHistory from "./locales/en/taskHistory.json";
import plTaskHistory from "./locales/pl/taskHistory.json";
import deTaskHistory from "./locales/de/taskHistory.json";

// Task history modals bundles
import enTaskHistoryModals from "./locales/en/taskHistoryModals.json";
import plTaskHistoryModals from "./locales/pl/taskHistoryModals.json";
import deTaskHistoryModals from "./locales/de/taskHistoryModals.json";

// Other languages unchanged
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
  step07: AnyObj,
  step08: AnyObj,
  step09: AnyObj,
  others: AnyObj[]
): AnyObj {
  return {
    ...stripCreatePlant(base),
    ...stripCreatePlant(step01),
    ...stripCreatePlant(step02),
    ...stripCreatePlant(step03),
    ...stripCreatePlant(step04),
    ...stripCreatePlant(step05),
    ...stripCreatePlant(step06),
    ...stripCreatePlant(step07),
    ...stripCreatePlant(step08),
    ...stripCreatePlant(step09),

    ...Object.assign({}, ...others.map(stripCreatePlant)),

    ...mergeCreatePlant(
      base,
      step01,
      step02,
      step03,
      step04,
      step05,
      step06,
      step07,
      step08,
      step09
    ),
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
      enCreatePlantStep07 as AnyObj,
      enCreatePlantStep08 as AnyObj,
      enCreatePlantStep09 as AnyObj,
      [
        enLogin,
        enRegister,
        enRegisterSuccess,
        enResendActivation,
        enConfirmEmail,
        enForgotPassword,
        enNavigation,
        enResetPassword,
        enLanguages,
        enScanner,
        enPlants,
        enPlantsModals,
        enLocations,
        enLocationsModals,
        enPlantDetails,
        enPlantDetailsModals,
        enReminders,
        enRemindersModals,
        enReadings,
        enReadingsModals,
        enReadingsHistory,
        enProfile,
        enProfileModals,
        enHome,
        enHomeModals,
        enTaskHistory,
        enTaskHistoryModals,
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
      plCreatePlantStep07 as AnyObj,
      plCreatePlantStep08 as AnyObj,
      plCreatePlantStep09 as AnyObj,
      [
        plLogin,
        plRegister,
        plRegisterSuccess,
        plResendActivation,
        plConfirmEmail,
        plForgotPassword,
        plNavigation,
        plResetPassword,
        plLanguages,
        plScanner,
        plPlants,
        plPlantsModals,
        plLocations,
        plLocationsModals,
        plPlantDetails,
        plPlantDetailsModals,
        plReminders,
        plRemindersModals,
        plReadings,
        plReadingsModals,
        plReadingsHistory,
        plProfile,
        plProfileModals,
        plHome,
        plHomeModals,
        plTaskHistory,
        plTaskHistoryModals,
      ] as AnyObj[]
    ),
  },

  de: {
    translation: buildTranslation(
      deCreatePlant as AnyObj,
      deCreatePlantStep01 as AnyObj,
      deCreatePlantStep02 as AnyObj,
      deCreatePlantStep03 as AnyObj,
      deCreatePlantStep04 as AnyObj,
      deCreatePlantStep05 as AnyObj,
      deCreatePlantStep06 as AnyObj,
      deCreatePlantStep07 as AnyObj,
      deCreatePlantStep08 as AnyObj,
      deCreatePlantStep09 as AnyObj,
      [
        deLogin,
        deRegister,
        deRegisterSuccess,
        deResendActivation,
        deConfirmEmail,
        deForgotPassword,
        deNavigation,
        deResetPassword,
        deLanguages,
        deScanner,
        dePlants,
        dePlantsModals,
        deLocations,
        deLocationsModals,
        dePlantDetails,
        dePlantDetailsModals,
        deReminders,
        deRemindersModals,
        deReadings,
        deReadingsModals,
        deReadingsHistory,
        deProfile,
        deProfileModals,
        deHome,
        deHomeModals,
        deTaskHistory,
        deTaskHistoryModals,
      ] as AnyObj[]
    ),
  },

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
