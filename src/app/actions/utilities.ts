"use server";

import { Prisma } from "@/generated/prisma/client";
import { forbidden, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { YearMonth } from "@/lib/date";
import { requireMemberGroup } from "@/lib/guards";
import { getOrCreateMonthCycle } from "@/lib/mess-service";
import { canEditEntry, isLeader } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { text, type FormState } from "@/lib/form";
import { latestEarlierBill } from "@/lib/utility-service";
import { fieldErrors, utilityAmountSchema, utilityTypeSchema } from "@/lib/validation";

function revalidateGroup(groupId: number) {
  revalidatePath(`/mess/${groupId}/utilities`);
  revalidatePath(`/mess/${groupId}/dashboard`);
}

async function requireLeader(groupId: number) {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();
  return actor;
}

type ParsedUtility = {
  name: string;
  sameForAll: boolean;
  amount: Prisma.Decimal | null;
  shares: { userId: number; amount: Prisma.Decimal }[];
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

  const shares: ParsedUtility["shares"] = [];
  if (values.split === "individual") {
    for (const { userId } of members) {
      const result = utilityAmountSchema.safeParse(values[`amount_${userId}`]);
      if (result.success) {
        shares.push({ userId, amount: new Prisma.Decimal(result.data) });
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
      shares: sameForAll ? [] : shares,
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

/** Replaces a month's bill for a type wholesale — shares included. */
async function writeBill(
  tx: Prisma.TransactionClient,
  utilityTypeId: number,
  monthCycleId: number,
  { sameForAll, amount, shares }: Omit<ParsedUtility, "name">,
) {
  const existing = await tx.utilityBill.findUnique({
    where: { utilityTypeId_monthCycleId: { utilityTypeId, monthCycleId } },
  });
  if (existing) {
    await tx.utilityBillShare.deleteMany({ where: { utilityBillId: existing.id } });
  }
  await tx.utilityBill.upsert({
    where: { utilityTypeId_monthCycleId: { utilityTypeId, monthCycleId } },
    create: {
      utilityTypeId,
      monthCycleId,
      sameForAll,
      amount,
      shares: { createMany: { data: shares } },
    },
    update: { sameForAll, amount, shares: { createMany: { data: shares } } },
  });
}

/** Leader only: define a new utility and set what it costs this month. */
export async function createUtilityType(
  groupId: number,
  month: YearMonth,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireLeader(groupId);

  const parsed = await parseUtilityForm(groupId, formData);
  if (!parsed.ok) return parsed.state;
  const { name, ...bill } = parsed.data;

  if (await hasDuplicateName(groupId, name)) {
    return { errors: { name: [DUPLICATE_NAME] }, values: { name } };
  }

  const monthCycle = await getOrCreateMonthCycle(groupId, month);
  await prisma.$transaction(async (tx) => {
    const type = await tx.utilityType.create({ data: { groupId, name } });
    await writeBill(tx, type.id, monthCycle.id, bill);
  });

  revalidateGroup(groupId);
  return { success: true };
}

/**
 * Leader only: rename a utility (applies to every month) and set or change
 * what it costs in the given month (applies to that month only).
 */
export async function updateUtilityBill(
  groupId: number,
  utilityTypeId: number,
  month: YearMonth,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireLeader(groupId);

  const type = await prisma.utilityType.findFirst({
    where: { id: utilityTypeId, groupId, isActive: true },
  });
  if (!type) notFound();

  const parsed = await parseUtilityForm(groupId, formData);
  if (!parsed.ok) return parsed.state;
  const { name, ...bill } = parsed.data;

  if (await hasDuplicateName(groupId, name, type.id)) {
    return { errors: { name: [DUPLICATE_NAME] }, values: { name } };
  }

  const monthCycle = await getOrCreateMonthCycle(groupId, month);
  await prisma.$transaction(async (tx) => {
    await tx.utilityType.update({ where: { id: type.id }, data: { name } });
    await writeBill(tx, type.id, monthCycle.id, bill);
  });

  revalidateGroup(groupId);
  return { success: true };
}

/**
 * Leader only: for every utility with no bill set this month, copy its most
 * recent earlier bill. Utilities that already have a bill are left alone, so
 * this is safe to press after hand-entering the ones that changed.
 */
export async function copyBillsFromPreviousMonth(groupId: number, formData: FormData) {
  await requireLeader(groupId);

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month)) notFound();

  const monthCycle = await getOrCreateMonthCycle(groupId, { year, month });
  const types = await prisma.utilityType.findMany({
    where: { groupId, isActive: true, bills: { none: { monthCycleId: monthCycle.id } } },
  });

  for (const type of types) {
    const earlier = await latestEarlierBill(type.id, { year, month });
    if (!earlier) continue;
    await prisma.utilityBill.create({
      data: {
        utilityTypeId: type.id,
        monthCycleId: monthCycle.id,
        sameForAll: earlier.bill.sameForAll,
        amount: earlier.bill.amount,
        shares: {
          createMany: {
            data: earlier.bill.shares.map(({ userId, amount }) => ({ userId, amount })),
          },
        },
      },
    });
  }

  revalidateGroup(groupId);
}

/**
 * Leader only. Deactivates rather than deletes so earlier months keep their
 * bills and payment history; the utility just stops appearing from now on.
 */
export async function removeUtilityType(groupId: number, utilityTypeId: number) {
  await requireLeader(groupId);

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
