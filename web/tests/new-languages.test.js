import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInstance } from "i18next";
import { LANGS } from "../src/config.js";

for (const [language, home] of [["id", "Beranda"], ["ru", "Главная"], ["tr", "Ana sayfa"]]) {
  test(`${language} translates navigation, documentation and email contact labels`, async () => {
    assert.ok(LANGS.includes(language));
    const namespaces = ["common", "docs_create_plant_wizard", "contact", "faq"];
    const resources = Object.fromEntries(await Promise.all(namespaces.map(async namespace => [
      namespace,
      JSON.parse(await readFile(new URL(`../src/locales/${language}/${namespace}.json`, import.meta.url), "utf8")),
    ])));
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: resources }, ns: namespaces });
    assert.equal(i18n.t("nav.start", { ns: "common" }), home);
    assert.equal(typeof i18n.t("language.id", { ns: "common" }), "string");
    const docs = i18n.t("docs_create_plant_wizard.sections", { ns: "docs_create_plant_wizard", returnObjects: true });
    assert.ok(Array.isArray(docs) && docs.length >= 9);
    assert.ok(docs.every(section => section.heading && section.body.length));
    const faq = i18n.t("items", { ns: "faq", returnObjects: true });
    assert.ok(Array.isArray(faq) && faq.every(item => item.q && item.a));
  });
}

test("language choices follow the selected website language", async () => {
  const expected = {
    pl: ["Indonezyjski", "Rosyjski", "Turecki"],
    en: ["Indonesian", "Russian", "Turkish"],
    de: ["Indonesisch", "Russisch", "Türkisch"],
    id: ["Bahasa Indonesia", "Bahasa Rusia", "Bahasa Turki"],
    ru: ["Индонезийский", "Русский", "Турецкий"],
    tr: ["Endonezce", "Rusça", "Türkçe"],
  };
  const resources = {};
  for (const language of LANGS) {
    resources[language] = { common: JSON.parse(await readFile(
      new URL(`../src/locales/${language}/common.json`, import.meta.url), "utf8",
    )) };
  }
  const i18n = createInstance();
  await i18n.init({ lng: "pl", fallbackLng: false, resources, defaultNS: "common" });
  for (const [language, labels] of Object.entries(expected)) {
    await i18n.changeLanguage(language);
    assert.deepEqual(["id", "ru", "tr"].map(code => i18n.t(`language.${code}`)), labels);
  }
});
