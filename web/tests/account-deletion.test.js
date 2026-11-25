import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { transform } from "esbuild";
import { LANGS } from "../src/config.js";

const require = createRequire(import.meta.url);
const { I18nextProvider } = require("react-i18next");
const source = await readFile(new URL("../src/routes/Contact.jsx", import.meta.url), "utf8");
const { code } = await transform(source, {
  loader: "jsx", format: "cjs", define: { "import.meta.env": "{}" },
});
const module = { exports: {} };
new Function("require", "module", "exports", code)((name) => {
  if (name.endsWith("TopToast.jsx")) return { default: () => null, __esModule: true };
  if (name.endsWith("contact.js")) return { sendPublicContact: () => { throw new Error("No network during rendering"); } };
  return require(name);
}, module, module.exports);
const Contact = module.exports.default;

for (const language of LANGS) {
  test(`${language}: public contact renders an actionable account deletion section`, async () => {
    const contact = JSON.parse((await readFile(new URL(`../src/locales/${language}/contact.json`, import.meta.url), "utf8")).replace(/^\uFEFF/, ""));
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: false, resources: { [language]: { contact } }, interpolation: { escapeValue: false } });
    const markup = renderToStaticMarkup(React.createElement(I18nextProvider, { i18n }, React.createElement(Contact)));
    assert.ok(markup.includes('id="account-deletion"'));
    assert.ok(markup.includes('href="mailto:info@flovers.app?subject=' + encodeURIComponent(contact.deletion.title) + '"'));
    for (const key of ["title", "instructions", "scope", "verification", "email"]) {
      assert.ok(contact.deletion[key]?.trim(), key);
      assert.ok(markup.includes(renderToStaticMarkup(React.createElement("span", null, contact.deletion[key])).slice(6, -7)), key);
    }
    assert.ok(markup.includes('<form'));
    assert.ok(markup.includes('id="contact-email"'));
  });
}
