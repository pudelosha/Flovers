import React from "react";
import { AppState, Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import { ContactsProvider, useContacts } from "../ContactsProvider";
import { SharingPreviewProvider, useSharingPreview } from "../SharingPreviewProvider";
import * as api from "../../../../api/services/contacts.service";

let mockSession = 1, mockUser = { id: 1, email: "one@example.test" };
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => mockSession }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../../../../api/services/contacts.service", () => ({
  fetchContacts: jest.fn(), sendContactInvitation: jest.fn(), acceptContactInvitation: jest.fn(), dismissContactInvitation: jest.fn(), renameContact: jest.fn(), deleteContact: jest.fn(),
  contactsErrorCode: () => "unavailable", isContactIdentifier: () => true,
}));
const person = (id: string) => ({ id, name: id, email: `${id}@example.test`, floversId: `FL-${id.padStart(32, "0")}` });
const snapshot = (id = "1", names = ["2"]) => ({ currentUser: person(id), contacts: names.map(person), invitations: [], counts: { contacts: names.length, incoming: 0, outgoing: 0 } });
let context: ReturnType<typeof useContacts>;
function Probe() {
  context = useContacts(); const { toast } = useSharingPreview();
  return <Text testID="state">{JSON.stringify({ snapshot: context.snapshot, loading: context.loading, error: context.error, pending: context.pending, toast: toast?.kind })}</Text>;
}
const tree = () => <SharingPreviewProvider><ContactsProvider><Probe /></ContactsProvider></SharingPreviewProvider>;
function deferred() { let resolve: any, reject: any; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(() => { jest.clearAllMocks(); mockSession = 1; mockUser = { id: 1, email: "one@example.test" }; (api.fetchContacts as jest.Mock).mockResolvedValue(snapshot()); });
afterEach(() => jest.restoreAllMocks());
it("keeps failed loads empty and retries without fabricated data", async () => {
  (api.fetchContacts as jest.Mock).mockRejectedValueOnce(new Error("offline")); render(tree());
  await waitFor(() => expect(context.error).toBe("unavailable")); expect(context.snapshot).toBeNull();
  await act(async () => { await context.refresh(); }); expect(context.snapshot?.currentUser.id).toBe("1");
});
it("publishes success and the real snapshot only after the server responds", async () => {
  const pending = deferred(); (api.sendContactInvitation as jest.Mock).mockReturnValue(pending.promise);
  const view = render(tree()); await waitFor(() => expect(context.loading).toBe(false));
  let result: any; act(() => { result = context.inviteContact("friend@example.test"); });
  expect(context.pending).toBe("invite"); expect(view.getByTestId("state").props.children).not.toContain("contactsInvitationAdded");
  await act(async () => { pending.resolve(snapshot("1", ["2", "3"])); await result; });
  expect(context.snapshot?.contacts).toHaveLength(2); expect(context.pending).toBeNull(); expect(view.getByTestId("state").props.children).toContain("contactsInvitationAdded");
});
it("preserves data and emits no success toast for a failed mutation", async () => {
  (api.deleteContact as jest.Mock).mockRejectedValue(new Error("offline")); const view = render(tree()); await waitFor(() => expect(context.loading).toBe(false));
  let result: any; await act(async () => { result = await context.removeContact("2"); });
  expect(result).toEqual({ ok: false, reason: "unavailable" }); expect(context.snapshot?.contacts).toHaveLength(1); expect(view.getByTestId("state").props.children).not.toContain("contactsContactDeleted");
});
it("discards an old account response across login boundaries", async () => {
  const old = deferred(); (api.fetchContacts as jest.Mock).mockReturnValueOnce(old.promise).mockResolvedValueOnce(snapshot("9", ["8"]));
  const view = render(tree()); mockSession = 2; mockUser = { id: 9, email: "nine@example.test" }; view.rerender(tree());
  await waitFor(() => expect(context.snapshot?.currentUser.id).toBe("9")); await act(async () => { old.resolve(snapshot("1")); });
  expect(context.snapshot?.currentUser.id).toBe("9"); expect(context.snapshot?.contacts[0].id).toBe("8");
});
it("does not let an older refresh overwrite a completed mutation", async () => {
  render(tree()); await waitFor(() => expect(context.loading).toBe(false)); const old = deferred(); (api.fetchContacts as jest.Mock).mockReturnValueOnce(old.promise);
  act(() => { void context.refresh(); }); (api.sendContactInvitation as jest.Mock).mockResolvedValue(snapshot("1", ["2", "3"]));
  await act(async () => { await context.inviteContact("new@example.test"); }); await act(async () => { old.resolve(snapshot()); });
  expect(context.snapshot?.contacts).toHaveLength(2);
});
it("serializes mutation taps instead of creating duplicate requests", async () => {
  render(tree()); await waitFor(() => expect(context.loading).toBe(false)); const pending = deferred(); (api.sendContactInvitation as jest.Mock).mockReturnValue(pending.promise);
  let first: any, second: any; await act(async () => { first = context.inviteContact("new@example.test"); second = await context.inviteContact("new@example.test"); });
  expect(second).toEqual({ ok: false, reason: "busy" }); expect(api.sendContactInvitation).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(snapshot()); await first; });
});
it("refreshes when the app returns to the foreground", async () => {
  const listeners: any[] = []; jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => { listeners.push(listener); return { remove: jest.fn() }; });
  render(tree()); await waitFor(() => expect(context.loading).toBe(false)); (api.fetchContacts as jest.Mock).mockResolvedValue(snapshot("1", ["2", "3"]));
  await act(async () => { listeners.forEach((listener) => listener("active")); }); expect(context.snapshot?.contacts).toHaveLength(2);
});
