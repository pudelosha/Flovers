import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Base bundles for all 12 languages
import enCreatePlant from "./locales/en/createPlant.json";
import plCreatePlant from "./locales/pl/createPlant.json";
import deCreatePlant from "./locales/de/createPlant.json";
import frCreatePlant from "./locales/fr/createPlant.json";
import itCreatePlant from "./locales/it/createPlant.json";
import esCreatePlant from "./locales/es/createPlant.json";
import ptCreatePlant from "./locales/pt/createPlant.json";
import arCreatePlant from "./locales/ar/createPlant.json";
import hiCreatePlant from "./locales/hi/createPlant.json";
import zhCreatePlant from "./locales/zh/createPlant.json";
import jaCreatePlant from "./locales/ja/createPlant.json";
import koCreatePlant from "./locales/ko/createPlant.json";

// Step bundles for all 12 languages
// Step 01
import enCreatePlantStep01 from "./locales/en/createPlantStep01.json";
import plCreatePlantStep01 from "./locales/pl/createPlantStep01.json";
import deCreatePlantStep01 from "./locales/de/createPlantStep01.json";
import frCreatePlantStep01 from "./locales/fr/createPlantStep01.json";
import itCreatePlantStep01 from "./locales/it/createPlantStep01.json";
import esCreatePlantStep01 from "./locales/es/createPlantStep01.json";
import ptCreatePlantStep01 from "./locales/pt/createPlantStep01.json";
import arCreatePlantStep01 from "./locales/ar/createPlantStep01.json";
import hiCreatePlantStep01 from "./locales/hi/createPlantStep01.json";
import zhCreatePlantStep01 from "./locales/zh/createPlantStep01.json";
import jaCreatePlantStep01 from "./locales/ja/createPlantStep01.json";
import koCreatePlantStep01 from "./locales/ko/createPlantStep01.json";

// Step 02
import enCreatePlantStep02 from "./locales/en/createPlantStep02.json";
import plCreatePlantStep02 from "./locales/pl/createPlantStep02.json";
import deCreatePlantStep02 from "./locales/de/createPlantStep02.json";
import frCreatePlantStep02 from "./locales/fr/createPlantStep02.json";
import itCreatePlantStep02 from "./locales/it/createPlantStep02.json";
import esCreatePlantStep02 from "./locales/es/createPlantStep02.json";
import ptCreatePlantStep02 from "./locales/pt/createPlantStep02.json";
import arCreatePlantStep02 from "./locales/ar/createPlantStep02.json";
import hiCreatePlantStep02 from "./locales/hi/createPlantStep02.json";
import zhCreatePlantStep02 from "./locales/zh/createPlantStep02.json";
import jaCreatePlantStep02 from "./locales/ja/createPlantStep02.json";
import koCreatePlantStep02 from "./locales/ko/createPlantStep02.json";

// Step 03
import enCreatePlantStep03 from "./locales/en/createPlantStep03.json";
import plCreatePlantStep03 from "./locales/pl/createPlantStep03.json";
import deCreatePlantStep03 from "./locales/de/createPlantStep03.json";
import frCreatePlantStep03 from "./locales/fr/createPlantStep03.json";
import itCreatePlantStep03 from "./locales/it/createPlantStep03.json";
import esCreatePlantStep03 from "./locales/es/createPlantStep03.json";
import ptCreatePlantStep03 from "./locales/pt/createPlantStep03.json";
import arCreatePlantStep03 from "./locales/ar/createPlantStep03.json";
import hiCreatePlantStep03 from "./locales/hi/createPlantStep03.json";
import zhCreatePlantStep03 from "./locales/zh/createPlantStep03.json";
import jaCreatePlantStep03 from "./locales/ja/createPlantStep03.json";
import koCreatePlantStep03 from "./locales/ko/createPlantStep03.json";

// Step 04
import enCreatePlantStep04 from "./locales/en/createPlantStep04.json";
import plCreatePlantStep04 from "./locales/pl/createPlantStep04.json";
import deCreatePlantStep04 from "./locales/de/createPlantStep04.json";
import frCreatePlantStep04 from "./locales/fr/createPlantStep04.json";
import itCreatePlantStep04 from "./locales/it/createPlantStep04.json";
import esCreatePlantStep04 from "./locales/es/createPlantStep04.json";
import ptCreatePlantStep04 from "./locales/pt/createPlantStep04.json";
import arCreatePlantStep04 from "./locales/ar/createPlantStep04.json";
import hiCreatePlantStep04 from "./locales/hi/createPlantStep04.json";
import zhCreatePlantStep04 from "./locales/zh/createPlantStep04.json";
import jaCreatePlantStep04 from "./locales/ja/createPlantStep04.json";
import koCreatePlantStep04 from "./locales/ko/createPlantStep04.json";

// Step 05
import enCreatePlantStep05 from "./locales/en/createPlantStep05.json";
import plCreatePlantStep05 from "./locales/pl/createPlantStep05.json";
import deCreatePlantStep05 from "./locales/de/createPlantStep05.json";
import frCreatePlantStep05 from "./locales/fr/createPlantStep05.json";
import itCreatePlantStep05 from "./locales/it/createPlantStep05.json";
import esCreatePlantStep05 from "./locales/es/createPlantStep05.json";
import ptCreatePlantStep05 from "./locales/pt/createPlantStep05.json";
import arCreatePlantStep05 from "./locales/ar/createPlantStep05.json";
import hiCreatePlantStep05 from "./locales/hi/createPlantStep05.json";
import zhCreatePlantStep05 from "./locales/zh/createPlantStep05.json";
import jaCreatePlantStep05 from "./locales/ja/createPlantStep05.json";
import koCreatePlantStep05 from "./locales/ko/createPlantStep05.json";

// Step 06
import enCreatePlantStep06 from "./locales/en/createPlantStep06.json";
import plCreatePlantStep06 from "./locales/pl/createPlantStep06.json";
import deCreatePlantStep06 from "./locales/de/createPlantStep06.json";
import frCreatePlantStep06 from "./locales/fr/createPlantStep06.json";
import itCreatePlantStep06 from "./locales/it/createPlantStep06.json";
import esCreatePlantStep06 from "./locales/es/createPlantStep06.json";
import ptCreatePlantStep06 from "./locales/pt/createPlantStep06.json";
import arCreatePlantStep06 from "./locales/ar/createPlantStep06.json";
import hiCreatePlantStep06 from "./locales/hi/createPlantStep06.json";
import zhCreatePlantStep06 from "./locales/zh/createPlantStep06.json";
import jaCreatePlantStep06 from "./locales/ja/createPlantStep06.json";
import koCreatePlantStep06 from "./locales/ko/createPlantStep06.json";

// Step 07
import enCreatePlantStep07 from "./locales/en/createPlantStep07.json";
import plCreatePlantStep07 from "./locales/pl/createPlantStep07.json";
import deCreatePlantStep07 from "./locales/de/createPlantStep07.json";
import frCreatePlantStep07 from "./locales/fr/createPlantStep07.json";
import itCreatePlantStep07 from "./locales/it/createPlantStep07.json";
import esCreatePlantStep07 from "./locales/es/createPlantStep07.json";
import ptCreatePlantStep07 from "./locales/pt/createPlantStep07.json";
import arCreatePlantStep07 from "./locales/ar/createPlantStep07.json";
import hiCreatePlantStep07 from "./locales/hi/createPlantStep07.json";
import zhCreatePlantStep07 from "./locales/zh/createPlantStep07.json";
import jaCreatePlantStep07 from "./locales/ja/createPlantStep07.json";
import koCreatePlantStep07 from "./locales/ko/createPlantStep07.json";

// Step 08
import enCreatePlantStep08 from "./locales/en/createPlantStep08.json";
import plCreatePlantStep08 from "./locales/pl/createPlantStep08.json";
import deCreatePlantStep08 from "./locales/de/createPlantStep08.json";
import frCreatePlantStep08 from "./locales/fr/createPlantStep08.json";
import itCreatePlantStep08 from "./locales/it/createPlantStep08.json";
import esCreatePlantStep08 from "./locales/es/createPlantStep08.json";
import ptCreatePlantStep08 from "./locales/pt/createPlantStep08.json";
import arCreatePlantStep08 from "./locales/ar/createPlantStep08.json";
import hiCreatePlantStep08 from "./locales/hi/createPlantStep08.json";
import zhCreatePlantStep08 from "./locales/zh/createPlantStep08.json";
import jaCreatePlantStep08 from "./locales/ja/createPlantStep08.json";
import koCreatePlantStep08 from "./locales/ko/createPlantStep08.json";

// Step 09
import enCreatePlantStep09 from "./locales/en/createPlantStep09.json";
import plCreatePlantStep09 from "./locales/pl/createPlantStep09.json";
import deCreatePlantStep09 from "./locales/de/createPlantStep09.json";
import frCreatePlantStep09 from "./locales/fr/createPlantStep09.json";
import itCreatePlantStep09 from "./locales/it/createPlantStep09.json";
import esCreatePlantStep09 from "./locales/es/createPlantStep09.json";
import ptCreatePlantStep09 from "./locales/pt/createPlantStep09.json";
import arCreatePlantStep09 from "./locales/ar/createPlantStep09.json";
import hiCreatePlantStep09 from "./locales/hi/createPlantStep09.json";
import zhCreatePlantStep09 from "./locales/zh/createPlantStep09.json";
import jaCreatePlantStep09 from "./locales/ja/createPlantStep09.json";
import koCreatePlantStep09 from "./locales/ko/createPlantStep09.json";

// Login bundles for all 12 languages
import enLogin from "./locales/en/login.json";
import plLogin from "./locales/pl/login.json";
import deLogin from "./locales/de/login.json";
import frLogin from "./locales/fr/login.json";
import itLogin from "./locales/it/login.json";
import esLogin from "./locales/es/login.json";
import ptLogin from "./locales/pt/login.json";
import arLogin from "./locales/ar/login.json";
import hiLogin from "./locales/hi/login.json";
import zhLogin from "./locales/zh/login.json";
import jaLogin from "./locales/ja/login.json";
import koLogin from "./locales/ko/login.json";

// Register bundles for all 12 languages
import enRegister from "./locales/en/register.json";
import plRegister from "./locales/pl/register.json";
import deRegister from "./locales/de/register.json";
import frRegister from "./locales/fr/register.json";
import itRegister from "./locales/it/register.json";
import esRegister from "./locales/es/register.json";
import ptRegister from "./locales/pt/register.json";
import arRegister from "./locales/ar/register.json";
import hiRegister from "./locales/hi/register.json";
import zhRegister from "./locales/zh/register.json";
import jaRegister from "./locales/ja/register.json";
import koRegister from "./locales/ko/register.json";

// RegisterSuccess bundles for all 12 languages
import enRegisterSuccess from "./locales/en/registerSuccess.json";
import plRegisterSuccess from "./locales/pl/registerSuccess.json";
import deRegisterSuccess from "./locales/de/registerSuccess.json";
import frRegisterSuccess from "./locales/fr/registerSuccess.json";
import itRegisterSuccess from "./locales/it/registerSuccess.json";
import esRegisterSuccess from "./locales/es/registerSuccess.json";
import ptRegisterSuccess from "./locales/pt/registerSuccess.json";
import arRegisterSuccess from "./locales/ar/registerSuccess.json";
import hiRegisterSuccess from "./locales/hi/registerSuccess.json";
import zhRegisterSuccess from "./locales/zh/registerSuccess.json";
import jaRegisterSuccess from "./locales/ja/registerSuccess.json";
import koRegisterSuccess from "./locales/ko/registerSuccess.json";

// ResendActivation bundles for all 12 languages
import enResendActivation from "./locales/en/resendActivation.json";
import plResendActivation from "./locales/pl/resendActivation.json";
import deResendActivation from "./locales/de/resendActivation.json";
import frResendActivation from "./locales/fr/resendActivation.json";
import itResendActivation from "./locales/it/resendActivation.json";
import esResendActivation from "./locales/es/resendActivation.json";
import ptResendActivation from "./locales/pt/resendActivation.json";
import arResendActivation from "./locales/ar/resendActivation.json";
import hiResendActivation from "./locales/hi/resendActivation.json";
import zhResendActivation from "./locales/zh/resendActivation.json";
import jaResendActivation from "./locales/ja/resendActivation.json";
import koResendActivation from "./locales/ko/resendActivation.json";

// ConfirmEmail bundles for all 12 languages
import enConfirmEmail from "./locales/en/confirmEmail.json";
import plConfirmEmail from "./locales/pl/confirmEmail.json";
import deConfirmEmail from "./locales/de/confirmEmail.json";
import frConfirmEmail from "./locales/fr/confirmEmail.json";
import itConfirmEmail from "./locales/it/confirmEmail.json";
import esConfirmEmail from "./locales/es/confirmEmail.json";
import ptConfirmEmail from "./locales/pt/confirmEmail.json";
import arConfirmEmail from "./locales/ar/confirmEmail.json";
import hiConfirmEmail from "./locales/hi/confirmEmail.json";
import zhConfirmEmail from "./locales/zh/confirmEmail.json";
import jaConfirmEmail from "./locales/ja/confirmEmail.json";
import koConfirmEmail from "./locales/ko/confirmEmail.json";

// ForgotPassword bundles for all 12 languages
import enForgotPassword from "./locales/en/forgotPassword.json";
import plForgotPassword from "./locales/pl/forgotPassword.json";
import deForgotPassword from "./locales/de/forgotPassword.json";
import frForgotPassword from "./locales/fr/forgotPassword.json";
import itForgotPassword from "./locales/it/forgotPassword.json";
import esForgotPassword from "./locales/es/forgotPassword.json";
import ptForgotPassword from "./locales/pt/forgotPassword.json";
import arForgotPassword from "./locales/ar/forgotPassword.json";
import hiForgotPassword from "./locales/hi/forgotPassword.json";
import zhForgotPassword from "./locales/zh/forgotPassword.json";
import jaForgotPassword from "./locales/ja/forgotPassword.json";
import koForgotPassword from "./locales/ko/forgotPassword.json";

// Navigation bundles for all 12 languages
import enNavigation from "./locales/en/navigation.json";
import plNavigation from "./locales/pl/navigation.json";
import deNavigation from "./locales/de/navigation.json";
import frNavigation from "./locales/fr/navigation.json";
import itNavigation from "./locales/it/navigation.json";
import esNavigation from "./locales/es/navigation.json";
import ptNavigation from "./locales/pt/navigation.json";
import arNavigation from "./locales/ar/navigation.json";
import hiNavigation from "./locales/hi/navigation.json";
import zhNavigation from "./locales/zh/navigation.json";
import jaNavigation from "./locales/ja/navigation.json";
import koNavigation from "./locales/ko/navigation.json";

// ResetPassword bundles for all 12 languages
import enResetPassword from "./locales/en/resetPassword.json";
import plResetPassword from "./locales/pl/resetPassword.json";
import deResetPassword from "./locales/de/resetPassword.json";
import frResetPassword from "./locales/fr/resetPassword.json";
import itResetPassword from "./locales/it/resetPassword.json";
import esResetPassword from "./locales/es/resetPassword.json";
import ptResetPassword from "./locales/pt/resetPassword.json";
import arResetPassword from "./locales/ar/resetPassword.json";
import hiResetPassword from "./locales/hi/resetPassword.json";
import zhResetPassword from "./locales/zh/resetPassword.json";
import jaResetPassword from "./locales/ja/resetPassword.json";
import koResetPassword from "./locales/ko/resetPassword.json";

// Languages bundles for all 12 languages
import enLanguages from "./locales/en/languages.json";
import plLanguages from "./locales/pl/languages.json";
import deLanguages from "./locales/de/languages.json";
import frLanguages from "./locales/fr/languages.json";
import itLanguages from "./locales/it/languages.json";
import esLanguages from "./locales/es/languages.json";
import ptLanguages from "./locales/pt/languages.json";
import arLanguages from "./locales/ar/languages.json";
import hiLanguages from "./locales/hi/languages.json";
import zhLanguages from "./locales/zh/languages.json";
import jaLanguages from "./locales/ja/languages.json";
import koLanguages from "./locales/ko/languages.json";

// Scanner bundles for all 12 languages
import enScanner from "./locales/en/scanner.json";
import plScanner from "./locales/pl/scanner.json";
import deScanner from "./locales/de/scanner.json";
import frScanner from "./locales/fr/scanner.json";
import itScanner from "./locales/it/scanner.json";
import esScanner from "./locales/es/scanner.json";
import ptScanner from "./locales/pt/scanner.json";
import arScanner from "./locales/ar/scanner.json";
import hiScanner from "./locales/hi/scanner.json";
import zhScanner from "./locales/zh/scanner.json";
import jaScanner from "./locales/ja/scanner.json";
import koScanner from "./locales/ko/scanner.json";

// Plants bundles for all 12 languages
import enPlants from "./locales/en/plants.json";
import plPlants from "./locales/pl/plants.json";
import dePlants from "./locales/de/plants.json";
import frPlants from "./locales/fr/plants.json";
import itPlants from "./locales/it/plants.json";
import esPlants from "./locales/es/plants.json";
import ptPlants from "./locales/pt/plants.json";
import arPlants from "./locales/ar/plants.json";
import hiPlants from "./locales/hi/plants.json";
import zhPlants from "./locales/zh/plants.json";
import jaPlants from "./locales/ja/plants.json";
import koPlants from "./locales/ko/plants.json";

// Plants modals bundles for all 12 languages
import enPlantsModals from "./locales/en/plantsModals.json";
import plPlantsModals from "./locales/pl/plantsModals.json";
import dePlantsModals from "./locales/de/plantsModals.json";
import frPlantsModals from "./locales/fr/plantsModals.json";
import itPlantsModals from "./locales/it/plantsModals.json";
import esPlantsModals from "./locales/es/plantsModals.json";
import ptPlantsModals from "./locales/pt/plantsModals.json";
import arPlantsModals from "./locales/ar/plantsModals.json";
import hiPlantsModals from "./locales/hi/plantsModals.json";
import zhPlantsModals from "./locales/zh/plantsModals.json";
import jaPlantsModals from "./locales/ja/plantsModals.json";
import koPlantsModals from "./locales/ko/plantsModals.json";

// Locations bundles for all 12 languages
import enLocations from "./locales/en/locations.json";
import plLocations from "./locales/pl/locations.json";
import deLocations from "./locales/de/locations.json";
import frLocations from "./locales/fr/locations.json";
import itLocations from "./locales/it/locations.json";
import esLocations from "./locales/es/locations.json";
import ptLocations from "./locales/pt/locations.json";
import arLocations from "./locales/ar/locations.json";
import hiLocations from "./locales/hi/locations.json";
import zhLocations from "./locales/zh/locations.json";
import jaLocations from "./locales/ja/locations.json";
import koLocations from "./locales/ko/locations.json";

// Locations modals bundles for all 12 languages
import enLocationsModals from "./locales/en/locationsModals.json";
import plLocationsModals from "./locales/pl/locationsModals.json";
import deLocationsModals from "./locales/de/locationsModals.json";
import frLocationsModals from "./locales/fr/locationsModals.json";
import itLocationsModals from "./locales/it/locationsModals.json";
import esLocationsModals from "./locales/es/locationsModals.json";
import ptLocationsModals from "./locales/pt/locationsModals.json";
import arLocationsModals from "./locales/ar/locationsModals.json";
import hiLocationsModals from "./locales/hi/locationsModals.json";
import zhLocationsModals from "./locales/zh/locationsModals.json";
import jaLocationsModals from "./locales/ja/locationsModals.json";
import koLocationsModals from "./locales/ko/locationsModals.json";

// Plant Details bundles for all 12 languages
import enPlantDetails from "./locales/en/plantDetails.json";
import plPlantDetails from "./locales/pl/plantDetails.json";
import dePlantDetails from "./locales/de/plantDetails.json";
import frPlantDetails from "./locales/fr/plantDetails.json";
import itPlantDetails from "./locales/it/plantDetails.json";
import esPlantDetails from "./locales/es/plantDetails.json";
import ptPlantDetails from "./locales/pt/plantDetails.json";
import arPlantDetails from "./locales/ar/plantDetails.json";
import hiPlantDetails from "./locales/hi/plantDetails.json";
import zhPlantDetails from "./locales/zh/plantDetails.json";
import jaPlantDetails from "./locales/ja/plantDetails.json";
import koPlantDetails from "./locales/ko/plantDetails.json";

// Plant Details modals bundles for all 12 languages
import enPlantDetailsModals from "./locales/en/plantDetailsModals.json";
import plPlantDetailsModals from "./locales/pl/plantDetailsModals.json";
import dePlantDetailsModals from "./locales/de/plantDetailsModals.json";
import frPlantDetailsModals from "./locales/fr/plantDetailsModals.json";
import itPlantDetailsModals from "./locales/it/plantDetailsModals.json";
import esPlantDetailsModals from "./locales/es/plantDetailsModals.json";
import ptPlantDetailsModals from "./locales/pt/plantDetailsModals.json";
import arPlantDetailsModals from "./locales/ar/plantDetailsModals.json";
import hiPlantDetailsModals from "./locales/hi/plantDetailsModals.json";
import zhPlantDetailsModals from "./locales/zh/plantDetailsModals.json";
import jaPlantDetailsModals from "./locales/ja/plantDetailsModals.json";
import koPlantDetailsModals from "./locales/ko/plantDetailsModals.json";

// Reminders bundles for all 12 languages
import enReminders from "./locales/en/reminders.json";
import plReminders from "./locales/pl/reminders.json";
import deReminders from "./locales/de/reminders.json";
import frReminders from "./locales/fr/reminders.json";
import itReminders from "./locales/it/reminders.json";
import esReminders from "./locales/es/reminders.json";
import ptReminders from "./locales/pt/reminders.json";
import arReminders from "./locales/ar/reminders.json";
import hiReminders from "./locales/hi/reminders.json";
import zhReminders from "./locales/zh/reminders.json";
import jaReminders from "./locales/ja/reminders.json";
import koReminders from "./locales/ko/reminders.json";

// Reminders modals bundles for all 12 languages
import enRemindersModals from "./locales/en/remindersModals.json";
import plRemindersModals from "./locales/pl/remindersModals.json";
import deRemindersModals from "./locales/de/remindersModals.json";
import frRemindersModals from "./locales/fr/remindersModals.json";
import itRemindersModals from "./locales/it/remindersModals.json";
import esRemindersModals from "./locales/es/remindersModals.json";
import ptRemindersModals from "./locales/pt/remindersModals.json";
import arRemindersModals from "./locales/ar/remindersModals.json";
import hiRemindersModals from "./locales/hi/remindersModals.json";
import zhRemindersModals from "./locales/zh/remindersModals.json";
import jaRemindersModals from "./locales/ja/remindersModals.json";
import koRemindersModals from "./locales/ko/remindersModals.json";

// Readings bundles for all 12 languages
import enReadings from "./locales/en/readings.json";
import plReadings from "./locales/pl/readings.json";
import deReadings from "./locales/de/readings.json";
import frReadings from "./locales/fr/readings.json";
import itReadings from "./locales/it/readings.json";
import esReadings from "./locales/es/readings.json";
import ptReadings from "./locales/pt/readings.json";
import arReadings from "./locales/ar/readings.json";
import hiReadings from "./locales/hi/readings.json";
import zhReadings from "./locales/zh/readings.json";
import jaReadings from "./locales/ja/readings.json";
import koReadings from "./locales/ko/readings.json";

// Readings modals bundles for all 12 languages
import enReadingsModals from "./locales/en/readingsModals.json";
import plReadingsModals from "./locales/pl/readingsModals.json";
import deReadingsModals from "./locales/de/readingsModals.json";
import frReadingsModals from "./locales/fr/readingsModals.json";
import itReadingsModals from "./locales/it/readingsModals.json";
import esReadingsModals from "./locales/es/readingsModals.json";
import ptReadingsModals from "./locales/pt/readingsModals.json";
import arReadingsModals from "./locales/ar/readingsModals.json";
import hiReadingsModals from "./locales/hi/readingsModals.json";
import zhReadingsModals from "./locales/zh/readingsModals.json";
import jaReadingsModals from "./locales/ja/readingsModals.json";
import koReadingsModals from "./locales/ko/readingsModals.json";

// Readings history bundles for all 12 languages
import enReadingsHistory from "./locales/en/readingsHistory.json";
import plReadingsHistory from "./locales/pl/readingsHistory.json";
import deReadingsHistory from "./locales/de/readingsHistory.json";
import frReadingsHistory from "./locales/fr/readingsHistory.json";
import itReadingsHistory from "./locales/it/readingsHistory.json";
import esReadingsHistory from "./locales/es/readingsHistory.json";
import ptReadingsHistory from "./locales/pt/readingsHistory.json";
import arReadingsHistory from "./locales/ar/readingsHistory.json";
import hiReadingsHistory from "./locales/hi/readingsHistory.json";
import zhReadingsHistory from "./locales/zh/readingsHistory.json";
import jaReadingsHistory from "./locales/ja/readingsHistory.json";
import koReadingsHistory from "./locales/ko/readingsHistory.json";

// Profile bundles for all 12 languages
import enProfile from "./locales/en/profile.json";
import plProfile from "./locales/pl/profile.json";
import deProfile from "./locales/de/profile.json";
import frProfile from "./locales/fr/profile.json";
import itProfile from "./locales/it/profile.json";
import esProfile from "./locales/es/profile.json";
import ptProfile from "./locales/pt/profile.json";
import arProfile from "./locales/ar/profile.json";
import hiProfile from "./locales/hi/profile.json";
import zhProfile from "./locales/zh/profile.json";
import jaProfile from "./locales/ja/profile.json";
import koProfile from "./locales/ko/profile.json";

// Profile modals bundles for all 12 languages
import enProfileModals from "./locales/en/profileModals.json";
import plProfileModals from "./locales/pl/profileModals.json";
import deProfileModals from "./locales/de/profileModals.json";
import frProfileModals from "./locales/fr/profileModals.json";
import itProfileModals from "./locales/it/profileModals.json";
import esProfileModals from "./locales/es/profileModals.json";
import ptProfileModals from "./locales/pt/profileModals.json";
import arProfileModals from "./locales/ar/profileModals.json";
import hiProfileModals from "./locales/hi/profileModals.json";
import zhProfileModals from "./locales/zh/profileModals.json";
import jaProfileModals from "./locales/ja/profileModals.json";
import koProfileModals from "./locales/ko/profileModals.json";

// Home bundles for all 12 languages
import enHome from "./locales/en/home.json";
import plHome from "./locales/pl/home.json";
import deHome from "./locales/de/home.json";
import frHome from "./locales/fr/home.json";
import itHome from "./locales/it/home.json";
import esHome from "./locales/es/home.json";
import ptHome from "./locales/pt/home.json";
import arHome from "./locales/ar/home.json";
import hiHome from "./locales/hi/home.json";
import zhHome from "./locales/zh/home.json";
import jaHome from "./locales/ja/home.json";
import koHome from "./locales/ko/home.json";

// Home modals bundles for all 12 languages
import enHomeModals from "./locales/en/homeModals.json";
import plHomeModals from "./locales/pl/homeModals.json";
import deHomeModals from "./locales/de/homeModals.json";
import frHomeModals from "./locales/fr/homeModals.json";
import itHomeModals from "./locales/it/homeModals.json";
import esHomeModals from "./locales/es/homeModals.json";
import ptHomeModals from "./locales/pt/homeModals.json";
import arHomeModals from "./locales/ar/homeModals.json";
import hiHomeModals from "./locales/hi/homeModals.json";
import zhHomeModals from "./locales/zh/homeModals.json";
import jaHomeModals from "./locales/ja/homeModals.json";
import koHomeModals from "./locales/ko/homeModals.json";

// Task history bundles for all 12 languages
import enTaskHistory from "./locales/en/taskHistory.json";
import plTaskHistory from "./locales/pl/taskHistory.json";
import deTaskHistory from "./locales/de/taskHistory.json";
import frTaskHistory from "./locales/fr/taskHistory.json";
import itTaskHistory from "./locales/it/taskHistory.json";
import esTaskHistory from "./locales/es/taskHistory.json";
import ptTaskHistory from "./locales/pt/taskHistory.json";
import arTaskHistory from "./locales/ar/taskHistory.json";
import hiTaskHistory from "./locales/hi/taskHistory.json";
import zhTaskHistory from "./locales/zh/taskHistory.json";
import jaTaskHistory from "./locales/ja/taskHistory.json";
import koTaskHistory from "./locales/ko/taskHistory.json";

// Task history modals bundles for all 12 languages
import enTaskHistoryModals from "./locales/en/taskHistoryModals.json";
import plTaskHistoryModals from "./locales/pl/taskHistoryModals.json";
import deTaskHistoryModals from "./locales/de/taskHistoryModals.json";
import frTaskHistoryModals from "./locales/fr/taskHistoryModals.json";
import itTaskHistoryModals from "./locales/it/taskHistoryModals.json";
import esTaskHistoryModals from "./locales/es/taskHistoryModals.json";
import ptTaskHistoryModals from "./locales/pt/taskHistoryModals.json";
import arTaskHistoryModals from "./locales/ar/taskHistoryModals.json";
import hiTaskHistoryModals from "./locales/hi/taskHistoryModals.json";
import zhTaskHistoryModals from "./locales/zh/taskHistoryModals.json";
import jaTaskHistoryModals from "./locales/ja/taskHistoryModals.json";
import koTaskHistoryModals from "./locales/ko/taskHistoryModals.json";

// LANGS array with all supported languages
export const LANGS = [
  "en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"
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
  fr: {
    translation: buildTranslation(
      frCreatePlant as AnyObj,
      frCreatePlantStep01 as AnyObj,
      frCreatePlantStep02 as AnyObj,
      frCreatePlantStep03 as AnyObj,
      frCreatePlantStep04 as AnyObj,
      frCreatePlantStep05 as AnyObj,
      frCreatePlantStep06 as AnyObj,
      frCreatePlantStep07 as AnyObj,
      frCreatePlantStep08 as AnyObj,
      frCreatePlantStep09 as AnyObj,
      [
        frLogin,
        frRegister,
        frRegisterSuccess,
        frResendActivation,
        frConfirmEmail,
        frForgotPassword,
        frNavigation,
        frResetPassword,
        frLanguages,
        frScanner,
        frPlants,
        frPlantsModals,
        frLocations,
        frLocationsModals,
        frPlantDetails,
        frPlantDetailsModals,
        frReminders,
        frRemindersModals,
        frReadings,
        frReadingsModals,
        frReadingsHistory,
        frProfile,
        frProfileModals,
        frHome,
        frHomeModals,
        frTaskHistory,
        frTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  it: {
    translation: buildTranslation(
      itCreatePlant as AnyObj,
      itCreatePlantStep01 as AnyObj,
      itCreatePlantStep02 as AnyObj,
      itCreatePlantStep03 as AnyObj,
      itCreatePlantStep04 as AnyObj,
      itCreatePlantStep05 as AnyObj,
      itCreatePlantStep06 as AnyObj,
      itCreatePlantStep07 as AnyObj,
      itCreatePlantStep08 as AnyObj,
      itCreatePlantStep09 as AnyObj,
      [
        itLogin,
        itRegister,
        itRegisterSuccess,
        itResendActivation,
        itConfirmEmail,
        itForgotPassword,
        itNavigation,
        itResetPassword,
        itLanguages,
        itScanner,
        itPlants,
        itPlantsModals,
        itLocations,
        itLocationsModals,
        itPlantDetails,
        itPlantDetailsModals,
        itReminders,
        itRemindersModals,
        itReadings,
        itReadingsModals,
        itReadingsHistory,
        itProfile,
        itProfileModals,
        itHome,
        itHomeModals,
        itTaskHistory,
        itTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  es: {
    translation: buildTranslation(
      esCreatePlant as AnyObj,
      esCreatePlantStep01 as AnyObj,
      esCreatePlantStep02 as AnyObj,
      esCreatePlantStep03 as AnyObj,
      esCreatePlantStep04 as AnyObj,
      esCreatePlantStep05 as AnyObj,
      esCreatePlantStep06 as AnyObj,
      esCreatePlantStep07 as AnyObj,
      esCreatePlantStep08 as AnyObj,
      esCreatePlantStep09 as AnyObj,
      [
        esLogin,
        esRegister,
        esRegisterSuccess,
        esResendActivation,
        esConfirmEmail,
        esForgotPassword,
        esNavigation,
        esResetPassword,
        esLanguages,
        esScanner,
        esPlants,
        esPlantsModals,
        esLocations,
        esLocationsModals,
        esPlantDetails,
        esPlantDetailsModals,
        esReminders,
        esRemindersModals,
        esReadings,
        esReadingsModals,
        esReadingsHistory,
        esProfile,
        esProfileModals,
        esHome,
        esHomeModals,
        esTaskHistory,
        esTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  pt: {
    translation: buildTranslation(
      ptCreatePlant as AnyObj,
      ptCreatePlantStep01 as AnyObj,
      ptCreatePlantStep02 as AnyObj,
      ptCreatePlantStep03 as AnyObj,
      ptCreatePlantStep04 as AnyObj,
      ptCreatePlantStep05 as AnyObj,
      ptCreatePlantStep06 as AnyObj,
      ptCreatePlantStep07 as AnyObj,
      ptCreatePlantStep08 as AnyObj,
      ptCreatePlantStep09 as AnyObj,
      [
        ptLogin,
        ptRegister,
        ptRegisterSuccess,
        ptResendActivation,
        ptConfirmEmail,
        ptForgotPassword,
        ptNavigation,
        ptResetPassword,
        ptLanguages,
        ptScanner,
        ptPlants,
        ptPlantsModals,
        ptLocations,
        ptLocationsModals,
        ptPlantDetails,
        ptPlantDetailsModals,
        ptReminders,
        ptRemindersModals,
        ptReadings,
        ptReadingsModals,
        ptReadingsHistory,
        ptProfile,
        ptProfileModals,
        ptHome,
        ptHomeModals,
        ptTaskHistory,
        ptTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  ar: {
    translation: buildTranslation(
      arCreatePlant as AnyObj,
      arCreatePlantStep01 as AnyObj,
      arCreatePlantStep02 as AnyObj,
      arCreatePlantStep03 as AnyObj,
      arCreatePlantStep04 as AnyObj,
      arCreatePlantStep05 as AnyObj,
      arCreatePlantStep06 as AnyObj,
      arCreatePlantStep07 as AnyObj,
      arCreatePlantStep08 as AnyObj,
      arCreatePlantStep09 as AnyObj,
      [
        arLogin,
        arRegister,
        arRegisterSuccess,
        arResendActivation,
        arConfirmEmail,
        arForgotPassword,
        arNavigation,
        arResetPassword,
        arLanguages,
        arScanner,
        arPlants,
        arPlantsModals,
        arLocations,
        arLocationsModals,
        arPlantDetails,
        arPlantDetailsModals,
        arReminders,
        arRemindersModals,
        arReadings,
        arReadingsModals,
        arReadingsHistory,
        arProfile,
        arProfileModals,
        arHome,
        arHomeModals,
        arTaskHistory,
        arTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  hi: {
    translation: buildTranslation(
      hiCreatePlant as AnyObj,
      hiCreatePlantStep01 as AnyObj,
      hiCreatePlantStep02 as AnyObj,
      hiCreatePlantStep03 as AnyObj,
      hiCreatePlantStep04 as AnyObj,
      hiCreatePlantStep05 as AnyObj,
      hiCreatePlantStep06 as AnyObj,
      hiCreatePlantStep07 as AnyObj,
      hiCreatePlantStep08 as AnyObj,
      hiCreatePlantStep09 as AnyObj,
      [
        hiLogin,
        hiRegister,
        hiRegisterSuccess,
        hiResendActivation,
        hiConfirmEmail,
        hiForgotPassword,
        hiNavigation,
        hiResetPassword,
        hiLanguages,
        hiScanner,
        hiPlants,
        hiPlantsModals,
        hiLocations,
        hiLocationsModals,
        hiPlantDetails,
        hiPlantDetailsModals,
        hiReminders,
        hiRemindersModals,
        hiReadings,
        hiReadingsModals,
        hiReadingsHistory,
        hiProfile,
        hiProfileModals,
        hiHome,
        hiHomeModals,
        hiTaskHistory,
        hiTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  zh: {
    translation: buildTranslation(
      zhCreatePlant as AnyObj,
      zhCreatePlantStep01 as AnyObj,
      zhCreatePlantStep02 as AnyObj,
      zhCreatePlantStep03 as AnyObj,
      zhCreatePlantStep04 as AnyObj,
      zhCreatePlantStep05 as AnyObj,
      zhCreatePlantStep06 as AnyObj,
      zhCreatePlantStep07 as AnyObj,
      zhCreatePlantStep08 as AnyObj,
      zhCreatePlantStep09 as AnyObj,
      [
        zhLogin,
        zhRegister,
        zhRegisterSuccess,
        zhResendActivation,
        zhConfirmEmail,
        zhForgotPassword,
        zhNavigation,
        zhResetPassword,
        zhLanguages,
        zhScanner,
        zhPlants,
        zhPlantsModals,
        zhLocations,
        zhLocationsModals,
        zhPlantDetails,
        zhPlantDetailsModals,
        zhReminders,
        zhRemindersModals,
        zhReadings,
        zhReadingsModals,
        zhReadingsHistory,
        zhProfile,
        zhProfileModals,
        zhHome,
        zhHomeModals,
        zhTaskHistory,
        zhTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  ja: {
    translation: buildTranslation(
      jaCreatePlant as AnyObj,
      jaCreatePlantStep01 as AnyObj,
      jaCreatePlantStep02 as AnyObj,
      jaCreatePlantStep03 as AnyObj,
      jaCreatePlantStep04 as AnyObj,
      jaCreatePlantStep05 as AnyObj,
      jaCreatePlantStep06 as AnyObj,
      jaCreatePlantStep07 as AnyObj,
      jaCreatePlantStep08 as AnyObj,
      jaCreatePlantStep09 as AnyObj,
      [
        jaLogin,
        jaRegister,
        jaRegisterSuccess,
        jaResendActivation,
        jaConfirmEmail,
        jaForgotPassword,
        jaNavigation,
        jaResetPassword,
        jaLanguages,
        jaScanner,
        jaPlants,
        jaPlantsModals,
        jaLocations,
        jaLocationsModals,
        jaPlantDetails,
        jaPlantDetailsModals,
        jaReminders,
        jaRemindersModals,
        jaReadings,
        jaReadingsModals,
        jaReadingsHistory,
        jaProfile,
        jaProfileModals,
        jaHome,
        jaHomeModals,
        jaTaskHistory,
        jaTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
  ko: {
    translation: buildTranslation(
      koCreatePlant as AnyObj,
      koCreatePlantStep01 as AnyObj,
      koCreatePlantStep02 as AnyObj,
      koCreatePlantStep03 as AnyObj,
      koCreatePlantStep04 as AnyObj,
      koCreatePlantStep05 as AnyObj,
      koCreatePlantStep06 as AnyObj,
      koCreatePlantStep07 as AnyObj,
      koCreatePlantStep08 as AnyObj,
      koCreatePlantStep09 as AnyObj,
      [
        koLogin,
        koRegister,
        koRegisterSuccess,
        koResendActivation,
        koConfirmEmail,
        koForgotPassword,
        koNavigation,
        koResetPassword,
        koLanguages,
        koScanner,
        koPlants,
        koPlantsModals,
        koLocations,
        koLocationsModals,
        koPlantDetails,
        koPlantDetailsModals,
        koReminders,
        koRemindersModals,
        koReadings,
        koReadingsModals,
        koReadingsHistory,
        koProfile,
        koProfileModals,
        koHome,
        koHomeModals,
        koTaskHistory,
        koTaskHistoryModals,
      ] as AnyObj[]
    ),
  },
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