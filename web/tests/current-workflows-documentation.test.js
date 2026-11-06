import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LANGS } from "../src/config.js";

async function read(language, name, mobile = false) {
  const base = mobile ? "../../mobile/src/i18n/locales" : "../src/locales";
  return JSON.parse(await readFile(new URL(`${base}/${language}/${name}.json`, import.meta.url), "utf8"));
}

for (const language of LANGS) {
  test(`${language}: documentation follows current plant tabs, sharing settings and pump defaults`, async () => {
    const names = ["docs_plants", "docs_plant_details", "docs_sharing", "docs_profile", "docs_readings", "docs_home", "schemas"];
    const docs = Object.fromEntries(await Promise.all(names.map(async name => [name, await read(language, name)])));
    const details = docs.docs_plant_details.docs_plant_details.sections;
    const appDetails = (await read(language, "plantDetails", true)).plantDetails;
    const scanner = (await read(language, "scanner", true)).scanner;
    const sharing = (await read(language, "sharing", true)).sharing;
    assert.equal(details[2].heading, appDetails.segments.reminders);
    assert.match(details[2].body.join(" "), /10/);
    assert.ok(details[7].body[0].includes(scanner.qrPath1));
    assert.ok(details[3].body[1].includes(appDetails.qr.title));
    assert.ok(docs.docs_plants.docs_plants.sections[2].body.some(text => text.includes(sharing.plants.shareSinglePlant)));
    for (const label of Object.values(sharing.plants.filters)) {
      assert.ok(docs.docs_sharing.docs_sharing.sections[0].body[0].includes(label));
    }
    assert.equal(
      docs.docs_sharing.docs_sharing.sections[4].body[2],
      docs.docs_profile.docs_profile.sections[6].body[4],
    );
    assert.match(docs.docs_readings.docs_readings.sections[13].body.at(-1), /20/);
    assert.match(docs.schemas.generatedFirmware.adjustIntro, /20/);
    assert.match(docs.schemas.generatedFirmware.adjustIntro, /1.{1,5}300/);
    assert.ok(docs.docs_home.docs_home.sections[7].body.every(text => text.trim()));
  });
}
