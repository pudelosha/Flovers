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
    assert.equal(i18n.t("language.id", { ns: "common" }), "Bahasa Indonesia");
    const docs = i18n.t("docs_create_plant_wizard.sections", { ns: "docs_create_plant_wizard", returnObjects: true });
    assert.ok(Array.isArray(docs) && docs.length >= 9);
    assert.ok(docs.every(section => section.heading && section.body.length));
    const faq = i18n.t("items", { ns: "faq", returnObjects: true });
    assert.ok(Array.isArray(faq) && faq.every(item => item.q && item.a));
  });
}
