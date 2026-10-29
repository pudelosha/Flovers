import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInstance } from "i18next";
import { LANGS } from "../src/config.js";

for (const language of LANGS) {
  test(`${language}: contacts, sharing, XP and homepage copy are available without fallback`, async () => {
    const names = ["docs", "docs_contacts", "docs_sharing", "docs_profile", "home", "faq"];
    const bundles = Object.fromEntries(await Promise.all(names.map(async name => [name,
      JSON.parse(await readFile(new URL(`../src/locales/${language}/${name}.json`, import.meta.url), "utf8")),
    ])));
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: bundles }, ns: names });
    for (const name of ["contacts", "sharing"]) {
      const title = i18n.t(`docs_${name}.title`, { ns: `docs_${name}` });
      assert.equal(title, i18n.t(`screens.${name}.title`, { ns: "docs" }));
      const sections = i18n.t(`docs_${name}.sections`, { ns: `docs_${name}`, returnObjects: true });
      assert.ok(Array.isArray(sections) && sections.length >= 3);
      assert.ok(sections.every(section => section.heading && section.body.every(paragraph => paragraph.trim())));
    }
    const profile = bundles.docs_profile.docs_profile.sections;
    const ranks = profile.find(section => section.body.length === 10 && section.body[0].startsWith("1–10"));
    assert.ok(ranks);
    assert.ok(ranks.body[9].startsWith("91–100"));
    const xp = profile.find(section => section.body.some(paragraph => paragraph.includes("250")));
    assert.ok(xp && JSON.stringify(xp).includes("UTC"));
    for (const name of ["sharing", "levels"]) {
      const feature = bundles.home.featureGrid.tiles[name];
      assert.ok(feature.title.trim() && feature.text.trim());
    }
    assert.equal(bundles.faq.items.length, 32);
    assert.ok(bundles.faq.items[24].a.trim() && bundles.faq.items[26].a.trim() && bundles.faq.items[27].a.trim());
  });
}
