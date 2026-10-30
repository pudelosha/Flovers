import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { transform } from "esbuild";
import { LANGS } from "../src/config.js";

// The transformed routes use CommonJS; share that instance's React context.
const require = createRequire(import.meta.url);
const { I18nextProvider } = require("react-i18next");

// Exercise the actual routes, so clauses cannot silently exist only in JSON.
async function route(name) {
  const source = await readFile(new URL(`../src/routes/${name}.jsx`, import.meta.url), "utf8");
  const { code } = await transform(source, { loader: "jsx", format: "cjs" });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(require, module, module.exports);
  return module.exports.default;
}

const Terms = await route("Terms");
const PrivacyPolicy = await route("PrivacyPolicy");

for (const language of LANGS) {
  test(`${language}: image terms and privacy clauses are translated and rendered`, async () => {
    const resources = {};
    for (const name of ["terms", "privacy-policy"]) {
      const text = await readFile(new URL(`../src/locales/${language}/${name}.json`, import.meta.url), "utf8");
      resources[name] = JSON.parse(text.replace(/^\uFEFF/, ""));
    }
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, ns: ["terms", "privacy-policy"],
      resources: { [language]: resources }, interpolation: { escapeValue: false } });

    for (const [Component, namespace, prefix, section, count] of [
      [Terms, "terms", "terms", "section18", 6],
      [PrivacyPolicy, "privacy-policy", "privacy", "section11", 7],
    ]) {
      const content = resources[namespace][prefix][section];
      assert.ok(content.title.trim());
      assert.equal(content.items.length, count);
      const markup = renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Component)));
      assert.ok(markup.includes(content.title));
      for (const paragraph of content.items) {
        assert.ok(typeof paragraph === "string" && paragraph.trim());
        assert.ok(markup.includes(renderToStaticMarkup(React.createElement("li", null, paragraph))));
      }
      assert.ok(markup.includes("2026-10-30"));
      assert.ok(!markup.includes(`${prefix}.${section}`));
      assert.ok(!markup.includes("ec.europa.eu/consumers/odr"));
    }
    assert.ok(resources.terms.terms.section16.p3.includes("https://consumer-redress.ec.europa.eu/"));
    assert.ok(resources.terms.terms.section6.p3.trim());
    assert.ok(resources["privacy-policy"].privacy.section7.p4.includes("Firebase Cloud Messaging"));
    assert.ok(resources["privacy-policy"].privacy.section3.list.length >= 8);
  });
}
