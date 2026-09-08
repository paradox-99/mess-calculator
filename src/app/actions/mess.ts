"use server";

import { Prisma } from "@/generated/prisma/client";
import { forbidden, notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireMemberGroup } from "@/lib/guards";
import { isLeader } from "@/lib/permissions";
import { addExtraMeal, PermissionError, recordDailyEntry } from "@/lib/mess-service";
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
  };

  const parsed = dailyEntrySchema.safeParse({
    date: values.date,
    lunch: Boolean(formData.get("lunch")),
    dinner: Boolean(formData.get("dinner")),
    cost: values.cost,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const date = parseISODate(parsed.data.date);
  if (!date) return { errors: { date: ["Enter a valid date."] }, values };

  try {
    await recordDailyEntry({
      actorId: actor.id,
      groupId,
      targetUserId,
      date,
      lunch: parsed.data.lunch ? ONE : ZERO,
      dinner: parsed.data.dinner ? ONE : ZERO,
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
