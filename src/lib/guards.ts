import { forbidden, notFound } from "next/navigation";
import type { Group, User } from "@/generated/prisma/client";

import { isLeader, isMember, isSuperuser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Route guards: the permission predicates turned into HTTP outcomes. Kept
 * apart from src/lib/permissions.ts so the mess service never pulls
 * `next/navigation` into its dependency graph.
 */

/**
 * 404 (not 403) for non-members — a group's existence isn't revealed to people
 * outside it, which is what "can't see others' group activity" actually
 * requires. Mirrors `groups.utils.get_member_group_or_404`.
 */
export async function requireMemberGroup(userId: number, groupId: number): Promise<Group> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();
  if (!(await isMember(userId, group.id))) notFound();
  return group;
}

/** Same as above, then 403 unless the viewer leads the group. */
export async function requireLeaderGroup(userId: number, groupId: number): Promise<Group> {
  const group = await requireMemberGroup(userId, groupId);
  if (!(await isLeader(userId, group.id))) forbidden();
  return group;
}

/** 403 unless the viewer is a superuser — gates the site-wide admin dashboard. */
export function requireSuperuser(user: Pick<User, "isSuperuser">): void {
  if (!isSuperuser(user)) forbidden();
}

/** Parses a route segment that must be a positive integer id, else 404. */
export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  return id;
}
