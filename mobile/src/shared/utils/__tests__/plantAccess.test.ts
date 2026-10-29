import { plantAccess } from "../plantAccess";
import type { ApiPlantAccess } from "../plantAccess";

const shared = (changes: Partial<ApiPlantAccess> = {}): ApiPlantAccess => ({
  is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: false,
  owner: { id: "1", name: "Mom" }, expires_at: null, ...changes,
});
it("supports the previous owner-only API when access is absent", () => {
  expect(plantAccess()).toMatchObject({ isOwner: true, canEdit: true, canCompleteTasks: true, isShared: false });
});
it("keeps read-only recipients from editing or completing tasks", () => {
  expect(plantAccess(shared())).toMatchObject({ isOwner: false, isShared: true, canEdit: false, canCompleteTasks: false, ownerName: "Mom" });
});
it("allows only task completion for a caregiver", () => {
  expect(plantAccess(shared({ can_complete_tasks: true }))).toMatchObject({ canEdit: false, canCompleteTasks: true });
});
it("denies completion after the grant expires", () => {
  expect(plantAccess(shared({ can_complete_tasks: true, expires_at: "2000-01-01T00:00:00Z" })).canCompleteTasks).toBe(false);
  expect(plantAccess(shared({ can_complete_tasks: true, expires_at: "2999-01-01T00:00:00Z" })).canCompleteTasks).toBe(true);
});
it.each([null, {}, { is_owner: true }, shared({ owner: null as any }), shared({ expires_at: "bad" }), shared({ is_owner: true })])("fails closed for malformed access %p", (access) => {
  expect(plantAccess(access as any)).toMatchObject({ isOwner: false, canEdit: false, canCompleteTasks: false });
});
