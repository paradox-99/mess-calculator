import "server-only";

import { Prisma, type MonthCycle, type UtilityType } from "@/generated/prisma/client";

import { monthLabel, type YearMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export type UtilityBillWithShares = Prisma.UtilityBillGetPayload<{ include: { shares: true } }>;

/** A utility together with what it costs in one month (null = not set yet). */
export type MonthlyUtility = { type: UtilityType; bill: UtilityBillWithShares | null };

/** The group's current utilities, in the order the leader added them. */
export async function activeUtilityTypes(groupId: number): Promise<UtilityType[]> {
  return prisma.utilityType.findMany({
    where: { groupId, isActive: true },
    orderBy: { id: "asc" },
  });
}

/** Every active utility paired with its bill for this month, if one is set. */
export async function monthlyUtilities(
  groupId: number,
  monthCycleId: number,
): Promise<MonthlyUtility[]> {
  const [types, bills] = await Promise.all([
    activeUtilityTypes(groupId),
    prisma.utilityBill.findMany({ where: { monthCycleId }, include: { shares: true } }),
  ]);
  const byType = new Map(bills.map((bill) => [bill.utilityTypeId, bill]));
  return types.map((type) => ({ type, bill: byType.get(type.id) ?? null }));
}

/**
 * What one member owes for a bill: the shared figure when it's split
 * evenly, else their own share. Null when there's no bill this month or the
 * leader hasn't set a figure for them (a member who joined after an
 * individually-priced bill was made).
 */
export function amountFor(
  bill: UtilityBillWithShares | null,
  userId: number,
): Prisma.Decimal | null {
  if (!bill) return null;
  if (bill.sameForAll) return bill.amount;
  return bill.shares.find((row) => row.userId === userId)?.amount ?? null;
}

/**
 * The most recent bill for a utility from any month before `before`, with the
 * month it came from — what the editor prefills with, since rent rarely
 * changes even though gas does.
 */
export async function latestEarlierBill(
  utilityTypeId: number,
  before: YearMonth,
): Promise<{ bill: UtilityBillWithShares; monthLabel: string } | null> {
  const bill = await prisma.utilityBill.findFirst({
    where: {
      utilityTypeId,
      monthCycle: {
        OR: [
          { year: { lt: before.year } },
          { year: before.year, month: { lt: before.month } },
        ],
      },
    },
    include: { shares: true, monthCycle: { select: { year: true, month: true } } },
    orderBy: [{ monthCycle: { year: "desc" } }, { monthCycle: { month: "desc" } }],
  });
  if (!bill) return null;
  const { monthCycle, ...rest } = bill;
  return { bill: rest, monthLabel: monthLabel(monthCycle) };
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
  monthCycle: MonthCycle,
  members: { id: number; username: string }[],
): Promise<MemberDues[]> {
  const [utilities, paid] = await Promise.all([
    monthlyUtilities(groupId, monthCycle.id),
    paidUtilityKeys(monthCycle.id),
  ]);

  const dues: MemberDues[] = [];
  for (const user of members) {
    const unpaid = utilities
      .filter(({ type }) => !paid.has(`${type.id}:${user.id}`))
      .map(({ type, bill }) => ({ name: type.name, amount: amountFor(bill, user.id) }));
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
