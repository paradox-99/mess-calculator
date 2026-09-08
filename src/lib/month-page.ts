import "server-only";

import { prisma } from "@/lib/prisma";
import { monthLabel, monthValue, type YearMonth } from "@/lib/date";

export type MonthOption = { value: string; label: string };

/**
 * The month dropdown's options: every cycle the group already has, newest
 * first, with the month being viewed pinned in front if it isn't one of them
 * yet. Shared by the dashboard and the daily-details page.
 */
export async function monthOptions(
  groupId: number,
  selected: YearMonth,
): Promise<{ options: MonthOption[]; selectedValue: string; label: string }> {
  const cycles = await prisma.monthCycle.findMany({
    where: { groupId },
    select: { year: true, month: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const options = cycles.map((cycle) => ({
    value: monthValue(cycle),
    label: monthLabel(cycle),
  }));

  const selectedValue = monthValue(selected);
  const label = monthLabel(selected);
  if (!options.some((option) => option.value === selectedValue)) {
    options.unshift({ value: selectedValue, label });
  }

  return { options, selectedValue, label };
}
