import "server-only";

import { Prisma, type MonthCycle } from "@/generated/prisma/client";

import { canEditEntry, isMember } from "@/lib/permissions";
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

/** Which sittings the maid skipped on a date. Group-wide, not per member. */
export type MaidAbsenceFlags = { lunch: boolean; dinner: boolean };

const MAID_PRESENT: MaidAbsenceFlags = { lunch: false, dinner: false };

export type DailyEntryValues = {
  lunch: boolean;
  dinner: boolean;
  cost: string;
  maidAbsent: MaidAbsenceFlags;
};

const EMPTY_ENTRY_VALUES: DailyEntryValues = {
  lunch: false,
  dinner: false,
  cost: "",
  maidAbsent: MAID_PRESENT,
};

async function maidAbsenceFor(
  monthCycleId: number,
  date: Date,
  client: Tx | typeof prisma = prisma,
): Promise<MaidAbsenceFlags> {
  const absence = await client.maidAbsence.findUnique({
    where: { monthCycleId_date: { monthCycleId, date } },
    select: { lunch: true, dinner: true },
  });
  return absence ?? MAID_PRESENT;
}

/**
 * A member's existing DailyEntry for one date, formatted for form prefill.
 * Read-only: unlike getOrCreateMonthCycle, it never creates a MonthCycle, so
 * looking up a date with no entries yet just reports the empty state.
 */
export async function entryForDate(
  groupId: number,
  userId: number,
  date: Date,
): Promise<DailyEntryValues> {
  const monthCycle = await prisma.monthCycle.findUnique({
    where: {
      groupId_year_month: {
        groupId,
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
      },
    },
  });
  if (!monthCycle) return EMPTY_ENTRY_VALUES;

  const [entry, maidAbsent] = await Promise.all([
    prisma.dailyEntry.findUnique({
      where: { monthCycleId_userId_date: { monthCycleId: monthCycle.id, userId, date } },
    }),
    maidAbsenceFor(monthCycle.id, date),
  ]);
  if (!entry) return { ...EMPTY_ENTRY_VALUES, maidAbsent };

  return {
    lunch: !entry.lunch.isZero(),
    dinner: !entry.dinner.isZero(),
    cost: entry.cost.isZero() ? "" : entry.cost.toString(),
    maidAbsent,
  };
}

/**
 * Mark (or unmark) the maid as absent for a date's lunch and/or dinner. The
 * absence belongs to the whole group, so any active member may set it — but
 * because a skipped sitting means nobody ate, marking a meal absent also
 * clears that meal on every member's entry for the date. Those clears are
 * audited under the member who marked the absence, which is the one place a
 * non-leader legitimately changes someone else's entry.
 *
 * Unmarking doesn't restore anything; members re-log the meal themselves.
 */
export async function setMaidAbsence({
  actorId,
  groupId,
  date,
  lunch,
  dinner,
}: {
  actorId: number;
  groupId: number;
  date: Date;
  lunch: boolean;
  dinner: boolean;
}) {
  if (!(await isMember(actorId, groupId))) {
    throw new PermissionError("You are not a member of this group.");
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

    const before = await maidAbsenceFor(monthCycle.id, date, tx);
    if (before.lunch === lunch && before.dinner === dinner) return before;

    await tx.maidAbsence.upsert({
      where: { monthCycleId_date: { monthCycleId: monthCycle.id, date } },
      create: { monthCycleId: monthCycle.id, date, lunch, dinner, markedById: actorId },
      update: { lunch, dinner, markedById: actorId },
    });

    const newlyAbsent = (["lunch", "dinner"] as const).filter(
      (meal) => !before[meal] && { lunch, dinner }[meal],
    );
    if (newlyAbsent.length === 0) return { lunch, dinner };

    const entries = await tx.dailyEntry.findMany({
      where: { monthCycleId: monthCycle.id, date },
    });
    const logs: Prisma.ActivityLogCreateManyInput[] = [];
    for (const entry of entries) {
      const updates: Prisma.DailyEntryUpdateInput = {};
      for (const meal of newlyAbsent) {
        if (entry[meal].isZero()) continue;
        updates[meal] = ZERO;
        logs.push({
          groupId,
          actorId,
          targetUserId: entry.userId,
          entryDate: date,
          action: "UPDATE",
          fieldName: meal,
          oldValue: entry[meal].toString(),
          newValue: ZERO.toString(),
        });
      }
      if (Object.keys(updates).length > 0) {
        await tx.dailyEntry.update({ where: { id: entry.id }, data: updates });
      }
    }

    if (logs.length > 0) {
      await tx.activityLog.createMany({ data: logs });
      await recalculateMonthCycle(monthCycle.id, tx);
    }

    return { lunch, dinner };
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

    // A sitting the maid skipped can't be eaten, whatever the form sent.
    const maidAbsent = await maidAbsenceFor(monthCycle.id, date, tx);
    for (const meal of ["lunch", "dinner"] as const) {
      const value = { lunch, dinner }[meal];
      if (maidAbsent[meal] && value && !value.isZero()) {
        throw new PermissionError(
          `The maid was absent for ${meal} on this date, so ${meal} can't be logged.`,
        );
      }
    }

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
