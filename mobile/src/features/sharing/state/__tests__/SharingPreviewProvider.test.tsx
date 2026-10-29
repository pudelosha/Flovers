import React from "react";
import { AppState, Text } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";
import { SharingPreviewProvider, useSharingPreview } from "../SharingPreviewProvider";
import * as api from "../../../../api/services/sharing.service";

let mockSession = 1;
let mockUser = { id: 1, email: "owner@example.test" };
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => mockSession }));
jest.mock("../../../../app/providers/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../../../../api/services/sharing.service", () => ({ fetchSharing: jest.fn(), updatePlantSharing: jest.fn(), deletePlantShare: jest.fn(), sharingErrorCode: (error: any) => error.reason ?? "unavailable" }));

const person = (id: string) => ({ id, name: id, email: `${id}@example.test`, floversId: `FL-${id.padStart(32, "0")}` });
const plant = { id: "10", name: "Bird" };
const outgoing = { id: "100", plant, contactId: "2", direction: "outgoing" as const, canCompleteTasks: true };
const incoming = { id: "101", plant: { id: "11", name: "Pilea" }, contactId: "2", direction: "incoming" as const, canCompleteTasks: false };
const snapshot = (user = "1", shares = [outgoing, incoming], revision = 3) => ({ currentUser: person(user), contacts: [person("2")], shares, versions: { "10": revision } });
const updates = [{ plant, recipients: [{ contactId: "2", canCompleteTasks: true }] }];
let context: ReturnType<typeof useSharingPreview>;
function Probe() { context = useSharingPreview(); return <Text testID="state">{JSON.stringify({ loaded: context.loaded, pending: context.pending, error: context.error, toast: context.toast?.kind })}</Text>; }
const tree = () => <SharingPreviewProvider><Probe /></SharingPreviewProvider>;
function deferred() { let resolve: any, reject: any; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function load() { await act(async () => { await context.refresh(); }); }
beforeEach(() => {
  jest.clearAllMocks(); mockSession = 1; mockUser = { id: 1, email: "owner@example.test" };
  (api.fetchSharing as jest.Mock).mockResolvedValue(snapshot());
  (api.updatePlantSharing as jest.Mock).mockResolvedValue(snapshot()); (api.deletePlantShare as jest.Mock).mockResolvedValue(snapshot("1", []));
});
afterEach(() => jest.restoreAllMocks());

it("starts empty without fake identities, grants or background requests", () => {
  render(tree()); expect(context.contacts).toEqual([]); expect(context.shares).toEqual([]); expect(context.currentUser).toBeNull(); expect(context.loaded).toBe(false); expect(api.fetchSharing).not.toHaveBeenCalled();
});
it("loads the authenticated snapshot and revisions", async () => {
  render(tree()); await load(); expect(context.contacts[0].id).toBe("2"); expect(context.shares).toHaveLength(2); expect(context.currentUser?.id).toBe("1"); expect(context.versions).toEqual({ "10": 3 });
});
it("retains an empty error state on failure and allows retry", async () => {
  (api.fetchSharing as jest.Mock).mockRejectedValueOnce(new Error("offline")); render(tree()); await load();
  expect(context.error).toBe("unavailable"); expect(context.loaded).toBe(false); expect(context.shares).toEqual([]); await load(); expect(context.loaded).toBe(true);
});
it("waits for server confirmation and supplies the loaded revisions", async () => {
  render(tree()); await load(); const pending = deferred(); (api.updatePlantSharing as jest.Mock).mockReturnValue(pending.promise);
  let work: any; act(() => { work = context.savePlantsSharing(updates); }); expect(context.pending).toBe("save"); expect(context.toast).toBeNull(); expect(context.shares).toHaveLength(2);
  await act(async () => { pending.resolve(snapshot("1", [outgoing], 4)); await work; });
  expect(api.updatePlantSharing).toHaveBeenCalledWith(updates, { "10": 3 }); expect(context.toast?.kind).toBe("sharingSaved"); expect(context.shares).toHaveLength(1); expect(context.pending).toBeNull();
});
it("keeps real grants and emits no success feedback after a failed save", async () => {
  render(tree()); await load(); (api.updatePlantSharing as jest.Mock).mockRejectedValue(new Error("offline")); let result: any;
  await act(async () => { result = await context.savePlantsSharing(updates); }); expect(result).toEqual({ ok: false, reason: "unavailable" }); expect(context.shares).toHaveLength(2); expect(context.toast).toBeNull();
});
it("refreshes revisions after conflict without closing the draft or claiming success", async () => {
  render(tree()); await load(); act(() => context.openSharePlant(plant, "2"));
  (api.updatePlantSharing as jest.Mock).mockRejectedValue({ reason: "conflict" }); (api.fetchSharing as jest.Mock).mockResolvedValue(snapshot("1", [outgoing], 8)); let result: any;
  await act(async () => { result = await context.savePlantsSharing(updates); }); expect(result).toEqual({ ok: false, reason: "conflict" }); expect(context.versions["10"]).toBe(8); expect(context.shareDraft?.contactId).toBe("2"); expect(context.toast).toBeNull();
});
it("distinguishes owner revocation from a recipient leaving", async () => {
  render(tree()); await load(); await act(async () => { await context.removeShare("100"); }); expect(context.toast?.kind).toBe("accessRemoved");
  await load(); await act(async () => { await context.removeShare("101"); }); expect(context.toast?.kind).toBe("plantLeft"); expect(api.deletePlantShare).toHaveBeenLastCalledWith("101");
});
it("discards an old refresh after a login change and clears drafts/toasts", async () => {
  const old = deferred(); (api.fetchSharing as jest.Mock).mockReturnValueOnce(old.promise); const view = render(tree()); let work: any;
  act(() => { work = context.refresh(); context.openSharePlant(plant); context.notify("idCopied"); });
  mockSession = 2; mockUser = { id: 9, email: "nine@example.test" }; view.rerender(tree());
  await act(async () => { old.resolve(snapshot()); await work; }); expect(context.currentUser).toBeNull(); expect(context.shareDraft).toBeNull(); expect(context.toast).toBeNull();
  (api.fetchSharing as jest.Mock).mockResolvedValue(snapshot("9")); await load(); expect(context.currentUser?.id).toBe("9");
});
it("does not let an older GET overwrite an accepted mutation", async () => {
  render(tree()); await load(); const old = deferred(); (api.fetchSharing as jest.Mock).mockReturnValueOnce(old.promise); let work: any;
  act(() => { work = context.refresh(); }); (api.updatePlantSharing as jest.Mock).mockResolvedValue(snapshot("1", [], 9));
  await act(async () => { await context.savePlantsSharing(updates); }); await act(async () => { old.resolve(snapshot()); await work; }); expect(context.versions["10"]).toBe(9); expect(context.shares).toEqual([]);
});
it("serializes repeated save taps", async () => {
  render(tree()); await load(); const pending = deferred(); (api.updatePlantSharing as jest.Mock).mockReturnValue(pending.promise); let work: any, result: any;
  await act(async () => { work = context.savePlantsSharing(updates); result = await context.savePlantsSharing(updates); }); expect(result).toEqual({ ok: false, reason: "busy" }); expect(api.updatePlantSharing).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(snapshot()); await work; });
});
it("refreshes on foreground only after sharing has been opened", async () => {
  let change: any; jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => { change = listener; return { remove: jest.fn() }; });
  render(tree()); await act(async () => { change("active"); }); expect(api.fetchSharing).not.toHaveBeenCalled(); await load();
  await act(async () => { change("active"); }); expect(api.fetchSharing).toHaveBeenCalledTimes(2);
});
it("does not allow an old toast dismissal to erase newer feedback", async () => {
  render(tree()); act(() => context.notify("idCopied")); const first = context.toast!.id; act(() => context.notify("copyFailed", "error")); act(() => context.dismissToast(first)); expect(context.toast?.kind).toBe("copyFailed");
});
