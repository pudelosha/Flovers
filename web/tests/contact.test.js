import test from "node:test";
import assert from "node:assert/strict";
import { sendPublicContact } from "../src/shared/contact.js";

test("public contact sends a sender address and locale without application credentials", async () => {
  const payload = { email: "sender@example.com", subject: "Help", message: "My question", copy_to_user: true, lang: "pl", website: "" };
  const controller = new AbortController();
  let sent;
  const result = await sendPublicContact("https://api.example.com/", payload, controller.signal, async (url, options) => {
    sent = { url, options };
    return { ok: true, json: async () => ({ status: "success", message: "Message sent." }) };
  });
  assert.equal(sent.url, "https://api.example.com/profile/support/public-contact/");
  assert.equal(sent.options.method, "POST");
  assert.deepEqual(JSON.parse(sent.options.body), payload);
  assert.equal(sent.options.signal, controller.signal);
  assert.equal(sent.options.headers.Authorization, undefined);
  assert.equal(result.status, "success");
});

test("public contact preserves throttling and validation statuses for the form", async () => {
  for (const status of [400, 429, 503]) {
    await assert.rejects(sendPublicContact("https://api.example.com", {}, undefined, async () => ({
      ok: false, status, json: async () => ({ detail: "Unavailable" }),
    })), error => error.status === status);
  }
});
