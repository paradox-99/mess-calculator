"use server";

import { randomBytes } from "node:crypto";
import { forbidden } from "next/navigation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { activeMembership, isLeader } from "@/lib/permissions";
import { text, type FormState } from "@/lib/form";
import {
  fieldErrors,
  groupCreateSchema,
  groupJoinSchema,
  memberUsernameSchema,
  transferLeadershipSchema,
} from "@/lib/validation";

/** Django's `secrets.token_urlsafe(6)[:8]`, retried on the unlikely collision. */
async function generateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomBytes(6).toString("base64url").slice(0, 8);
    if (!(await prisma.group.findUnique({ where: { inviteCode: code } }))) return code;
  }
  throw new Error("Could not generate a unique invite code.");
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const existing = await activeMembership(user.id);
  if (existing) redirect(`/mess/${existing.groupId}/dashboard`);

  const values = { name: text(formData, "name") };
  const parsed = groupCreateSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      inviteCode: await generateInviteCode(),
      createdById: user.id,
      memberships: { create: { userId: user.id, role: "LEADER" } },
    },
  });

  revalidatePath("/groups");
  redirect(`/mess/${group.id}/dashboard`);
}

export async function joinGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const existing = await activeMembership(user.id);
  if (existing) redirect(`/mess/${existing.groupId}/dashboard`);

  const values = { inviteCode: text(formData, "inviteCode") };
  const parsed = groupJoinSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data.inviteCode },
  });
  if (!group) {
    return { errors: { inviteCode: ["No group found with that invite code."] }, values };
  }

  await prisma.groupMembership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    create: { groupId: group.id, userId: user.id, role: "MEMBER" },
    update: {},
  });

  revalidatePath("/groups");
  redirect(`/mess/${group.id}/dashboard`);
}

export async function addMember(
  groupId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const values = { username: text(formData, "username") };
  const parsed = memberUsernameSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const user = await prisma.user.findFirst({
    where: { username: { equals: parsed.data.username, mode: "insensitive" } },
  });
  if (!user) {
    return { errors: { username: ["No user found with that username."] }, values };
  }

  const existing = await activeMembership(user.id);
  if (existing) {
    return {
      errors: {
        username: [
          existing.groupId === groupId
            ? "This user is already a member of this group."
            : "This user is already in another group.",
        ],
      },
      values,
    };
  }

  // A previously removed member keeps their row; re-activate it rather than
  // tripping the (group, user) unique constraint.
  await prisma.groupMembership.upsert({
    where: { groupId_userId: { groupId, userId: user.id } },
    create: { groupId, userId: user.id, role: "MEMBER" },
    update: { isActive: true, leftAt: null },
  });

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}

export async function removeMember(groupId: number, userId: number) {
  const actor = await requireUser();
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const member = await prisma.groupMembership.findFirst({
    where: { groupId, userId, isActive: true },
  });
  // The leader can't be removed — leadership has to be transferred first.
  if (member && member.role !== "LEADER") {
    await prisma.groupMembership.update({
      where: { id: member.id },
      data: { isActive: false, leftAt: new Date() },
    });
  }

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}

export async function transferLeadership(
  groupId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const values = { memberId: text(formData, "memberId") };
  const parsed = transferLeadershipSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: { memberId: ["Select a valid choice."] }, values };
  }

  const newLeader = await prisma.groupMembership.findFirst({
    where: { groupId, userId: parsed.data.memberId, isActive: true, role: "MEMBER" },
  });
  if (!newLeader) {
    return {
      errors: {
        memberId: ["Select a valid choice. That choice is not one of the available choices."],
      },
      values,
    };
  }

  const currentLeader = await prisma.groupMembership.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: actor.id } },
  });

  // Both role swaps land together, so the group is never left with two
  // leaders or none.
  await prisma.$transaction([
    prisma.groupMembership.update({
      where: { id: currentLeader.id },
      data: { role: "MEMBER" },
    }),
    prisma.groupMembership.update({ where: { id: newLeader.id }, data: { role: "LEADER" } }),
  ]);

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}
