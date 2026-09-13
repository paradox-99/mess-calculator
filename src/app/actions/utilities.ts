"use server";

import { Prisma } from "@/generated/prisma/client";
import { forbidden, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireMemberGroup } from "@/lib/guards";
import { getOrCreateMonthCycle } from "@/lib/mess-service";
import { canEditEntry, isLeader } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { text, type FormState } from "@/lib/form";
import { fieldErrors, utilityAmountSchema, utilityTypeSchema } from "@/lib/validation";

function revalidateGroup(groupId: number) {
  revalidatePath(`/mess/${groupId}/utilities`);
  revalidatePath(`/mess/${groupId}/dashboard`);
}

type ParsedUtility = {
  name: string;
  sameForAll: boolean;
  amount: Prisma.Decimal | null;
  memberAmounts: { userId: number; amount: Prisma.Decimal }[];
};

/**
 * Reads the utility form: name, the split mode, and either one shared amount
 * or an `amount_<userId>` per active member. Returns the bound-form FormState
 * on any problem so create and update render identical errors.
 */
async function parseUtilityForm(
  groupId: number,
  formData: FormData,
): Promise<{ ok: true; data: ParsedUtility } | { ok: false; state: FormState }> {
  const members = await prisma.groupMembership.findMany({
    where: { groupId, isActive: true },
    select: { userId: true },
  });

  const values: Record<string, string> = {
    name: text(formData, "name"),
    split: text(formData, "split") === "individual" ? "individual" : "same",
    amount: text(formData, "amount"),
  };
  for (const { userId } of members) {
    values[`amount_${userId}`] = text(formData, `amount_${userId}`);
  }

  const parsed = utilityTypeSchema.safeParse(values);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);

  const memberAmounts: ParsedUtility["memberAmounts"] = [];
  if (values.split === "individual") {
    for (const { userId } of members) {
      const result = utilityAmountSchema.safeParse(values[`amount_${userId}`]);
      if (result.success) {
        memberAmounts.push({ userId, amount: new Prisma.Decimal(result.data) });
      } else {
        errors[`amount_${userId}`] = [result.error.issues[0]?.message ?? "Enter a valid amount."];
      }
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, state: { errors, values } };
  }

  const sameForAll = parsed.data.split === "same";
  return {
    ok: true,
    data: {
      name: parsed.data.name,
      sameForAll,
      amount: sameForAll ? new Prisma.Decimal(parsed.data.amount) : null,
      memberAmounts: sameForAll ? [] : memberAmounts,
    },
  };
}

async function hasDuplicateName(groupId: number, name: string, exceptId?: number) {
  const duplicate = await prisma.utilityType.findFirst({
    where: {
      groupId,
      isActive: true,
      ...(exceptId === undefined ? {} : { id: { not: exceptId } }),
      name: { equals: name, mode: "insensitive" },
    },
  });
  return duplicate !== null;
}

const DUPLICATE_NAME = "This group already has a utility with that name.";

/** Leader only: define a new utility for the group. */
export async function createUtilityType(
  groupId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const parsed = await parseUtilityForm(groupId, formData);
  if (!parsed.ok) return parsed.state;
  const { name, sameForAll, amount, memberAmounts } = parsed.data;

  if (await hasDuplicateName(groupId, name)) {
    return { errors: { name: [DUPLICATE_NAME] }, values: { name } };
  }

  await prisma.utilityType.create({
    data: {
      groupId,
      name,
      sameForAll,
      amount,
      memberAmounts: { createMany: { data: memberAmounts } },
    },
  });

  revalidateGroup(groupId);
  return { success: true };
}

/** Leader only: rename a utility, change how it's split, or re-price it. */
export async function updateUtilityType(
  groupId: number,
  utilityTypeId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const type = await prisma.utilityType.findFirst({
    where: { id: utilityTypeId, groupId, isActive: true },
  });
  if (!type) notFound();

  const parsed = await parseUtilityForm(groupId, formData);
  if (!parsed.ok) return parsed.state;
  const { name, sameForAll, amount, memberAmounts } = parsed.data;

  if (await hasDuplicateName(groupId, name, type.id)) {
    return { errors: { name: [DUPLICATE_NAME] }, values: { name } };
  }

  // Per-member rows are replaced wholesale: switching to "same for everyone"
  // drops them, switching back starts from what the form just sent.
  await prisma.$transaction([
    prisma.utilityAmount.deleteMany({ where: { utilityTypeId: type.id } }),
    prisma.utilityType.update({
      where: { id: type.id },
      data: {
        name,
        sameForAll,
        amount,
        memberAmounts: { createMany: { data: memberAmounts } },
      },
    }),
  ]);

  revalidateGroup(groupId);
  return { success: true };
}

/**
 * Leader only. Deactivates rather than deletes so earlier months keep their
 * payment history; the utility just stops appearing from now on.
 */
export async function removeUtilityType(groupId: number, utilityTypeId: number) {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const type = await prisma.utilityType.findFirst({
    where: { id: utilityTypeId, groupId, isActive: true },
  });
  if (!type) notFound();

  await prisma.utilityType.update({ where: { id: type.id }, data: { isActive: false } });
  revalidateGroup(groupId);
}

/**
 * Tick or untick "paid" for one member, one utility, one month. Members mark
 * their own; the leader can mark anyone's — the same rule as meal entries.
 */
export async function setUtilityPaid({
  groupId,
  utilityTypeId,
  userId,
  year,
  month,
  paid,
}: {
  groupId: number;
  utilityTypeId: number;
  userId: number;
  year: number;
  month: number;
  paid: boolean;
}) {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await canEditEntry(actor.id, groupId, userId))) forbidden();

  const type = await prisma.utilityType.findFirst({
    where: { id: utilityTypeId, groupId, isActive: true },
  });
  if (!type) notFound();

  const monthCycle = await getOrCreateMonthCycle(groupId, { year, month });
  const where = {
    utilityTypeId_monthCycleId_userId: { utilityTypeId: type.id, monthCycleId: monthCycle.id, userId },
  };

  if (paid) {
    await prisma.utilityPayment.upsert({
      where,
      create: { utilityTypeId: type.id, monthCycleId: monthCycle.id, userId },
      update: {},
    });
  } else {
    await prisma.utilityPayment.deleteMany({
      where: { utilityTypeId: type.id, monthCycleId: monthCycle.id, userId },
    });
  }

  revalidateGroup(groupId);
}
