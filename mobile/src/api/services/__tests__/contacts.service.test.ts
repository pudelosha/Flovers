import { ApiError, request } from "../../client";
import { acceptContactInvitation, contactsErrorCode, deleteContact, dismissContactInvitation, fetchContacts,
  isContactIdentifier, parseContactsSnapshot, renameContact, sendContactInvitation } from "../contacts.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
  ApiError: jest.requireActual("../../client").ApiError,
}));
const person = (id: string) => ({ id, name: `User ${id}`, email: "", flovers_id: `FL-${id.padStart(32, "0")}` });
const envelope = () => ({ status: "success", data: { current_user: person("1"), contacts: [person("2")],
  invitations: [{ id: "9", contact: person("3"), direction: "incoming" }], counts: { contacts: 1, incoming: 1, outgoing: 0 } } });
beforeEach(() => { (request as jest.Mock).mockReset().mockResolvedValue(envelope()); });
it("maps the real snapshot while allowing pending contacts to hide their email", async () => {
  const result = await fetchContacts();
  expect(result.currentUser.floversId).toBe(person("1").flovers_id);
  expect(result.invitations[0].contact.email).toBe("");
  expect(request).toHaveBeenCalledWith("/contacts/", "GET", undefined, { auth: true });
});
it("uses authenticated mutation endpoints and trims form values", async () => {
  await sendContactInvitation("  friend@example.test  "); expect(request).toHaveBeenLastCalledWith("/contacts/invitations/", "POST", { identifier: "friend@example.test" }, { auth: true });
  await acceptContactInvitation("9"); expect(request).toHaveBeenLastCalledWith("/contacts/invitations/9/accept/", "POST", {}, { auth: true });
  await dismissContactInvitation("9"); expect(request).toHaveBeenLastCalledWith("/contacts/invitations/9/", "DELETE", undefined, { auth: true });
  await renameContact("2", "  Mom  "); expect(request).toHaveBeenLastCalledWith("/contacts/2/", "PATCH", { name: "Mom" }, { auth: true });
  await deleteContact("2"); expect(request).toHaveBeenLastCalledWith("/contacts/2/", "DELETE", undefined, { auth: true });
});
it.each([null, {}, { status: "error" }])("rejects malformed envelopes instead of inventing counts: %s", (value) => { expect(() => parseContactsSnapshot(value)).toThrow(); });
it("rejects incorrect counters and malformed identity IDs", () => {
  const badCount = envelope(); badCount.data.counts.incoming = 3; expect(() => parseContactsSnapshot(badCount)).toThrow();
  const badId = envelope(); badId.data.current_user.flovers_id = "FL-DEMO-ME"; expect(() => parseContactsSnapshot(badId)).toThrow();
});
it.each(["self", "notFound", "alreadyContact", "alreadyPending"])("preserves actionable server error %s", async (code) => {
  (request as jest.Mock).mockRejectedValue(new ApiError(409, { code })); await expect(sendContactInvitation("a@example.test")).rejects.toMatchObject({ reason: code });
});
it("maps throttling and transport errors", () => {
  expect(contactsErrorCode(new ApiError(429, {}))).toBe("throttled"); expect(contactsErrorCode(new Error("offline"))).toBe("unavailable");
});
it("recognizes emails and public IDs with optional dashes case-insensitively", () => {
  expect(isContactIdentifier("friend@example.test")).toBe(true); expect(isContactIdentifier(`fl${"a".repeat(32)}`)).toBe(true);
  expect(isContactIdentifier("FL-12345678-1234-1234-1234-123456789ABC")).toBe(true);
  expect(isContactIdentifier("FL-DEMO-ME")).toBe(false); expect(isContactIdentifier("not an email")).toBe(false);
});
