import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type UtilityTypeWithAmounts = Prisma.UtilityTypeGetPayload<{
  include: { memberAmounts: true };
}>;

/** The group's current utilities, in the order the leader added them. */
export async function activeUtilityTypes(groupId: number): Promise<UtilityTypeWithAmounts[]> {
  return prisma.utilityType.findMany({
    where: { groupId, isActive: true },
    include: { memberAmounts: true },
    orderBy: { id: "asc" },
  });
}

/**
 * What one member owes for a utility: the shared figure when it's split
 * evenly, else their own row. Null when the leader hasn't set a figure for
 * them yet (a member who joined after an individually-priced bill was made).
 */
export function amountFor(
  type: UtilityTypeWithAmounts,
  userId: number,
): Prisma.Decimal | null {
  if (type.sameForAll) return type.amount;
  return type.memberAmounts.find((row) => row.userId === userId)?.amount ?? null;
}

/**
 * Which (utility, member) pairs are paid in a month, as a set of
 * `${utilityTypeId}:${userId}` keys so a grid cell is one lookup.
 */
export async function paidUtilityKeys(monthCycleId: number): Promise<Set<string>> {
  const payments = await prisma.utilityPayment.findMany({
    where: { monthCycleId },
    select: { utilityTypeId: true, userId: true },
  });
  return new Set(payments.map((payment) => `${payment.utilityTypeId}:${payment.userId}`));
}

export type UnpaidUtility = { name: string; amount: Prisma.Decimal | null };

export type MemberDues = {
  user: { id: number; username: string };
  unpaid: UnpaidUtility[];
  /** Sum of the unpaid amounts that are set; "Not set" bills contribute 0. */
  total: Prisma.Decimal;
};

/**
 * Members with at least one utility still unpaid this month, each with the
 * bills they owe and the total. Everyone paid up → empty list.
 */
export async function unpaidUtilityDues(
  groupId: number,
  monthCycleId: number,
  members: { id: number; username: string }[],
): Promise<MemberDues[]> {
  const [types, paid] = await Promise.all([
    activeUtilityTypes(groupId),
    paidUtilityKeys(monthCycleId),
  ]);

  const dues: MemberDues[] = [];
  for (const user of members) {
    const unpaid = types
      .filter((type) => !paid.has(`${type.id}:${user.id}`))
      .map((type) => ({ name: type.name, amount: amountFor(type, user.id) }));
    if (unpaid.length === 0) continue;
    const total = unpaid.reduce(
      (sum, bill) => (bill.amount ? sum.plus(bill.amount) : sum),
      new Prisma.Decimal(0),
    );
    dues.push({ user, unpaid, total });
  }
  return dues;
}

export type UtilityStanding = "all-paid" | "unpaid" | "none";

/**
 * Per-member "paid everything this month?" for the dashboard column.
 * `none` when the group hasn't defined any utilities, so the column can show
 * a dash instead of accusing everyone of being unpaid.
 */
export async function utilityStandings(
  groupId: number,
  monthCycleId: number,
  userIds: number[],
): Promise<Map<number, UtilityStanding>> {
  const [types, paid] = await Promise.all([
    activeUtilityTypes(groupId),
    paidUtilityKeys(monthCycleId),
  ]);

  return new Map(
    userIds.map((userId) => {
      if (types.length === 0) return [userId, "none"];
      const allPaid = types.every((type) => paid.has(`${type.id}:${userId}`));
      return [userId, allPaid ? "all-paid" : "unpaid"];
    }),
  );
}
