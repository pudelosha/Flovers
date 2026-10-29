/** Server-owned access metadata. Missing data supports older owner-only APIs. */
export type ApiPlantAccess = {
  is_owner: boolean;
  is_shared: boolean;
  can_edit: boolean;
  can_complete_tasks: boolean;
  owner: { id: string; name: string };
  expires_at: string | null;
};

export function plantAccess(access?: ApiPlantAccess | null) {
  if (access === undefined) return { isOwner: true, isShared: false, canEdit: true, canCompleteTasks: true, ownerName: "" };
  const valid = !!access && typeof access.is_owner === "boolean" && typeof access.is_shared === "boolean" &&
    access.is_shared === !access.is_owner && typeof access.can_edit === "boolean" && typeof access.can_complete_tasks === "boolean" &&
    typeof access.owner?.id === "string" && !!access.owner.id && typeof access.owner.name === "string" &&
    (access.expires_at === null || (typeof access.expires_at === "string" && Number.isFinite(Date.parse(access.expires_at))));
  if (!valid) return { isOwner: false, isShared: true, canEdit: false, canCompleteTasks: false, ownerName: "" };
  const isOwner = access.is_owner === true;
  const expires = access.expires_at == null ? null : Date.parse(access.expires_at);
  const active = isOwner || expires === null || (Number.isFinite(expires) && expires > Date.now());
  return {
    isOwner,
    isShared: !isOwner,
    canEdit: isOwner && access.can_edit === true,
    canCompleteTasks: active && access.can_complete_tasks === true,
    ownerName: typeof access.owner?.name === "string" ? access.owner.name : "",
  };
}

export const SHARED_PLANT_TINT = "rgba(52, 112, 151, 0.16)";
