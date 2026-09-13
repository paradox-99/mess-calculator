"use server";

import { Prisma } from "@/generated/prisma/client";
import { forbidden, notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMemberGroup } from "@/lib/guards";
import { canEditEntry, isLeader } from "@/lib/permissions";
import {
  addExtraMeal,
  entryForDate,
  PermissionError,
  recordDailyEntry,
  setMaidAbsence,
  type DailyEntryValues,
} from "@/lib/mess-service";
import { compareYearMonth, currentYearMonth, parseISODate } from "@/lib/date";
import { text, type FormState } from "@/lib/form";
import { dailyEntrySchema, extraMealSchema, fieldErrors } from "@/lib/validation";

const ZERO = new Prisma.Decimal(0);
const ONE = new Prisma.Decimal(1);

export async function saveDailyEntry(
  groupId: number,
  targetUserId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);

  const values = {
    date: text(formData, "date"),
    lunch: formData.get("lunch") ? "on" : "",
    dinner: formData.get("dinner") ? "on" : "",
    cost: text(formData, "cost"),
    maid_absent_lunch: formData.get("maid_absent_lunch") ? "on" : "",
    maid_absent_dinner: formData.get("maid_absent_dinner") ? "on" : "",
  };

  const parsed = dailyEntrySchema.safeParse({
    date: values.date,
    lunch: Boolean(formData.get("lunch")),
    dinner: Boolean(formData.get("dinner")),
    cost: values.cost,
    maidAbsentLunch: Boolean(formData.get("maid_absent_lunch")),
    maidAbsentDinner: Boolean(formData.get("maid_absent_dinner")),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const date = parseISODate(parsed.data.date);
  if (!date) return { errors: { date: ["Enter a valid date."] }, values };

  try {
    // The absence is saved first so the entry write below sees it.
    await setMaidAbsence({
      actorId: actor.id,
      groupId,
      date,
      lunch: parsed.data.maidAbsentLunch,
      dinner: parsed.data.maidAbsentDinner,
    });
    await recordDailyEntry({
      actorId: actor.id,
      groupId,
      targetUserId,
      date,
      lunch: parsed.data.lunch && !parsed.data.maidAbsentLunch ? ONE : ZERO,
      dinner: parsed.data.dinner && !parsed.data.maidAbsentDinner ? ONE : ZERO,
      cost: new Prisma.Decimal(parsed.data.cost),
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return { errors: { __all__: [error.message] }, values };
    }
    throw error;
  }

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}

const EMPTY_ENTRY: DailyEntryValues = {
  lunch: false,
  dinner: false,
  cost: "",
  maidAbsent: { lunch: false, dinner: false },
};

/** Lets the entry form re-fetch a single date's record when the user picks a new date. */
export async function getDailyEntryValues(
  groupId: number,
  targetUserId: number,
  dateIso: string,
): Promise<DailyEntryValues> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await canEditEntry(actor.id, groupId, targetUserId))) forbidden();

  const date = parseISODate(dateIso);
  if (!date) return EMPTY_ENTRY;
  return entryForDate(groupId, targetUserId, date);
}

/** Same lookup, batched for the bulk entry form's day cards. */
export async function getDailyEntryValuesForDates(
  groupId: number,
  targetUserId: number,
  dateIsos: string[],
): Promise<Record<string, DailyEntryValues>> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await canEditEntry(actor.id, groupId, targetUserId))) forbidden();

  const result: Record<string, DailyEntryValues> = {};
  await Promise.all(
    dateIsos.map(async (dateIso) => {
      const date = parseISODate(dateIso);
      result[dateIso] = date ? await entryForDate(groupId, targetUserId, date) : EMPTY_ENTRY;
    }),
  );
  return result;
}

/** Saves one member's lunch/dinner/cost for each of several dates in one submit. */
export async function saveBulkDailyEntries(
  groupId: number,
  targetUserId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);

  const dateIsos = text(formData, "dates")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (dateIsos.length === 0) {
    return { errors: { __all__: ["Select at least one day."] } };
  }

  const values: Record<string, string> = { dates: dateIsos.join(",") };
  const errors: Record<string, string[]> = {};

  for (const dateIso of dateIsos) {
    values[`lunch_${dateIso}`] = formData.get(`lunch_${dateIso}`) ? "on" : "";
    values[`dinner_${dateIso}`] = formData.get(`dinner_${dateIso}`) ? "on" : "";
    values[`cost_${dateIso}`] = text(formData, `cost_${dateIso}`);
    values[`maid_absent_lunch_${dateIso}`] = formData.get(`maid_absent_lunch_${dateIso}`)
      ? "on"
      : "";
    values[`maid_absent_dinner_${dateIso}`] = formData.get(`maid_absent_dinner_${dateIso}`)
      ? "on"
      : "";

    const parsed = dailyEntrySchema.safeParse({
      date: dateIso,
      lunch: Boolean(formData.get(`lunch_${dateIso}`)),
      dinner: Boolean(formData.get(`dinner_${dateIso}`)),
      cost: values[`cost_${dateIso}`],
      maidAbsentLunch: Boolean(formData.get(`maid_absent_lunch_${dateIso}`)),
      maidAbsentDinner: Boolean(formData.get(`maid_absent_dinner_${dateIso}`)),
    });
    if (!parsed.success) {
      errors[dateIso] = [parsed.error.issues[0]?.message ?? "Enter a valid entry."];
      continue;
    }

    const date = parseISODate(parsed.data.date);
    if (!date) {
      errors[dateIso] = ["Enter a valid date."];
      continue;
    }

    try {
      await setMaidAbsence({
        actorId: actor.id,
        groupId,
        date,
        lunch: parsed.data.maidAbsentLunch,
        dinner: parsed.data.maidAbsentDinner,
      });
      await recordDailyEntry({
        actorId: actor.id,
        groupId,
        targetUserId,
        date,
        lunch: parsed.data.lunch && !parsed.data.maidAbsentLunch ? ONE : ZERO,
        dinner: parsed.data.dinner && !parsed.data.maidAbsentDinner ? ONE : ZERO,
        cost: new Prisma.Decimal(parsed.data.cost),
      });
    } catch (error) {
      if (error instanceof PermissionError) {
        errors[dateIso] = [error.message];
        continue;
      }
      throw error;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}

export async function saveExtraMeal(
  groupId: number,
  targetUserId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const values = {
    date: text(formData, "date"),
    mealType: text(formData, "mealType"),
    quantity: text(formData, "quantity"),
  };

  const parsed = extraMealSchema.safeParse(values);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const date = parseISODate(parsed.data.date);
  if (!date) return { errors: { date: ["Enter a valid date."] }, values };

  try {
    await addExtraMeal({
      actorId: actor.id,
      groupId,
      targetUserId,
      date,
      mealType: parsed.data.mealType,
      quantity: new Prisma.Decimal(parsed.data.quantity),
    });
  } catch (error) {
    if (error instanceof PermissionError) {
      return { errors: { __all__: [error.message] }, values };
    }
    throw error;
  }

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`/mess/${groupId}/dashboard`);
}

export async function closeMonth(groupId: number, formData: FormData) {
  const actor = await requireUser();
  await requireMemberGroup(actor.id, groupId);
  if (!(await isLeader(actor.id, groupId))) forbidden();

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month)) notFound();

  const target = { year, month };
  const base = `/mess/${groupId}/dashboard?year=${year}&month=${month}`;

  // A month can only be closed once it has actually ended.
  if (compareYearMonth(target, currentYearMonth()) >= 0) {
    redirect(`${base}&close=not-ready`);
  }

  const monthCycle = await prisma.monthCycle.findUnique({
    where: { groupId_year_month: { groupId, year, month } },
  });
  if (!monthCycle) notFound();

  await prisma.monthCycle.update({
    where: { id: monthCycle.id },
    data: { isClosed: true, closedAt: new Date() },
  });

  revalidatePath(`/mess/${groupId}/dashboard`);
  redirect(`${base}&close=closed`);
}
