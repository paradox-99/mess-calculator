import "server-only";

import { Prisma, type MonthCycle } from "@/generated/prisma/client";

import { canEditEntry } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { YearMonth } from "@/lib/date";

const ZERO = new Prisma.Decimal(0);
const ONE = new Prisma.Decimal(1);

/** Thrown where Django raised `PermissionDenied`. */
export class PermissionError extends Error {}

export type MealType = "lunch" | "dinner";

export type MemberBalance = {
  cost: Prisma.Decimal;
  meals: Prisma.Decimal;
  due: Prisma.Decimal;
  balance: Prisma.Decimal;
};

type Tx = Prisma.TransactionClient;

export async function getOrCreateMonthCycle(
  groupId: number,
  { year, month }: YearMonth,
  client: Tx | typeof prisma = prisma,
): Promise<MonthCycle> {
  return client.monthCycle.upsert({
    where: { groupId_year_month: { groupId, year, month } },
    create: { groupId, year, month },
    update: {},
  });
}

/**
 * Recompute and cache a cycle's totals from its DailyEntry rows.
 *
 * Django kept these in sync with post_save/post_delete signals on DailyEntry.
 * There is no signal layer here, so every write path in this module calls it
 * explicitly — which is also why nothing outside this module may write entries.
 */
export async function recalculateMonthCycle(
  monthCycleId: number,
  client: Tx | typeof prisma = prisma,
): Promise<void> {
  const entries = await client.dailyEntry.findMany({
    where: { monthCycleId },
    select: { lunch: true, dinner: true, cost: true },
  });

  let totalCost = ZERO;
  let totalMeals = ZERO;
  for (const entry of entries) {
    totalCost = totalCost.plus(entry.cost);
    totalMeals = totalMeals.plus(entry.lunch).plus(entry.dinner);
  }

  await client.monthCycle.update({
    where: { id: monthCycleId },
    data: {
      cachedTotalCost: totalCost,
      cachedTotalMeals: totalMeals,
      cachedMealRate: totalMeals.isZero() ? ZERO : totalCost.dividedBy(totalMeals),
    },
  });
}

/** (cost, meals, due, balance) for one member in this cycle. */
export async function balanceFor(
  monthCycle: MonthCycle,
  userId: number,
): Promise<MemberBalance> {
  const entries = await prisma.dailyEntry.findMany({
    where: { monthCycleId: monthCycle.id, userId },
    select: { lunch: true, dinner: true, cost: true },
  });

  let cost = ZERO;
  let meals = ZERO;
  for (const entry of entries) {
    cost = cost.plus(entry.cost);
    meals = meals.plus(entry.lunch).plus(entry.dinner);
  }

  const due = meals.times(monthCycle.cachedMealRate);
  return {
    cost,
    meals,
    due,
    // Positive = gets money back, negative = owes.
    balance: cost.minus(due),
  };
}

type RecordEntryInput = {
  actorId: number;
  groupId: number;
  targetUserId: number;
  date: Date;
  lunch?: Prisma.Decimal | null;
  dinner?: Prisma.Decimal | null;
  cost?: Prisma.Decimal | null;
};

/**
 * Create or update one member's DailyEntry for a date. This is the ONLY path
 * server actions and pages may use to touch DailyEntry — never call
 * prisma.dailyEntry.create()/update() from a route or action, or the audit
 * trail goes stale, the cached totals drift, and the permission rule isn't
 * enforced.
 *
 * Pass only the fields that changed (leave the rest undefined) — only those
 * get diffed and logged.
 */
export async function recordDailyEntry({
  actorId,
  groupId,
  targetUserId,
  date,
  lunch,
  dinner,
  cost,
}: RecordEntryInput) {
  if (!(await canEditEntry(actorId, groupId, targetUserId))) {
    throw new PermissionError(
      "You don't have permission to edit this member's entries in this group.",
    );
  }

  const cycleMonth: YearMonth = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };

  return prisma.$transaction(async (tx) => {
    const monthCycle = await getOrCreateMonthCycle(groupId, cycleMonth, tx);
    if (monthCycle.isClosed) {
      throw new PermissionError("This month's calculation is closed.");
    }

    const existing = await tx.dailyEntry.findUnique({
      where: {
        monthCycleId_userId_date: { monthCycleId: monthCycle.id, userId: targetUserId, date },
      },
    });
    const entry =
      existing ??
      (await tx.dailyEntry.create({
        data: { monthCycleId: monthCycle.id, userId: targetUserId, date },
      }));
    const created = existing === null;

    const incoming: Record<MealType | "cost", Prisma.Decimal | null | undefined> = {
      lunch,
      dinner,
      cost,
    };
    const changed: { field: string; oldValue: Prisma.Decimal; newValue: Prisma.Decimal }[] = [];
    const updates: Prisma.DailyEntryUpdateInput = {};

    for (const field of ["lunch", "dinner", "cost"] as const) {
      const newValue = incoming[field];
      if (newValue === null || newValue === undefined) continue;
      const oldValue = entry[field];
      if (!oldValue.equals(newValue)) {
        changed.push({ field, oldValue, newValue });
        updates[field] = newValue;
      }
    }

    let saved = entry;
    if (changed.length > 0) {
      saved = await tx.dailyEntry.update({ where: { id: entry.id }, data: updates });
    }

    if (changed.length > 0) {
      await tx.activityLog.createMany({
        data: changed.map(({ field, oldValue, newValue }) => ({
          groupId,
          actorId,
          targetUserId,
          entryDate: date,
          action: created ? ("CREATE" as const) : ("UPDATE" as const),
          fieldName: field,
          oldValue: created ? null : oldValue.toString(),
          newValue: newValue.toString(),
        })),
      });
    }

    if (created || changed.length > 0) {
      await recalculateMonthCycle(monthCycle.id, tx);
    }

    return saved;
  });
}

/** Increment one member's lunch or dinner count and audit the change. */
export async function addExtraMeal({
  actorId,
  groupId,
  targetUserId,
  date,
  mealType,
  quantity,
}: {
  actorId: number;
  groupId: number;
  targetUserId: number;
  date: Date;
  mealType: MealType;
  quantity: Prisma.Decimal;
}) {
  if (!(await canEditEntry(actorId, groupId, targetUserId))) {
    throw new PermissionError(
      "You don't have permission to edit this member's entries in this group.",
    );
  }

  const monthCycle = await getOrCreateMonthCycle(groupId, {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  });
  if (monthCycle.isClosed) {
    throw new PermissionError("This month's calculation is closed.");
  }

  const existing = await prisma.dailyEntry.findUnique({
    where: {
      monthCycleId_userId_date: { monthCycleId: monthCycle.id, userId: targetUserId, date },
    },
    select: { lunch: true, dinner: true },
  });
  const current = existing ? existing[mealType] : ZERO;

  return recordDailyEntry({
    actorId,
    groupId,
    targetUserId,
    date,
    [mealType]: current.plus(quantity),
  });
}

/** Meals beyond the first per sitting, which is what "extra meals" counts. */
export function extraMealsIn(entry: { lunch: Prisma.Decimal; dinner: Prisma.Decimal }) {
  return Prisma.Decimal.max(entry.lunch.minus(ONE), ZERO).plus(
    Prisma.Decimal.max(entry.dinner.minus(ONE), ZERO),
  );
}
