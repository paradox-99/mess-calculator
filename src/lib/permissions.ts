import type { GroupMembership } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * The permission predicates, ported from groups/permissions.py.
 *
 * Deliberately free of any routing imports so the service layer can depend on
 * them without dragging `next/navigation` along. The guards that turn a failed
 * check into a 403/404 response live in src/lib/guards.ts.
 */

export async function getMembership(
  userId: number,
  groupId: number,
): Promise<GroupMembership | null> {
  return prisma.groupMembership.findFirst({
    where: { groupId, userId, isActive: true },
  });
}

export async function isMember(userId: number, groupId: number): Promise<boolean> {
  return (await getMembership(userId, groupId)) !== null;
}

export async function isLeader(userId: number, groupId: number): Promise<boolean> {
  const membership = await getMembership(userId, groupId);
  return membership?.role === "LEADER";
}

/** Leader can edit anyone's entry in their group; a member can edit only their own. */
export async function canEditEntry(
  actorId: number,
  groupId: number,
  targetUserId: number,
): Promise<boolean> {
  const membership = await getMembership(actorId, groupId);
  if (membership === null) return false;
  if (membership.role === "LEADER") return true;
  return actorId === targetUserId;
}

/** Only the leader sees the audit trail. */
export async function canViewLogs(userId: number, groupId: number): Promise<boolean> {
  return isLeader(userId, groupId);
}

/** The single active group a user belongs to, or null. */
export async function activeMembership(userId: number) {
  return prisma.groupMembership.findFirst({
    where: { userId, isActive: true },
    include: { group: true },
    orderBy: { id: "asc" },
  });
}
