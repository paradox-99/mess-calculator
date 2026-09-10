import "server-only";

import { Prisma } from "@/generated/prisma/client";

import { currentYearMonth, previousMonth, utcDate, type YearMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

const ZERO = new Prisma.Decimal(0);
const SIGNUP_TREND_MONTHS = 6;

export type MonthlySignups = { year: number; month: number; label: string; count: number };

export type RecentGroup = {
  id: number;
  name: string;
  leaderUsername: string;
  activeMembers: number;
  createdAt: Date;
};

export type RecentSignup = {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
};

export type SiteAnalytics = {
  totalUsers: number;
  totalGroups: number;
  activeMembers: number;
  totalMealsLogged: Prisma.Decimal;
  totalMoneyTracked: Prisma.Decimal;
  openMonths: number;
  closedMonths: number;
  signupsByMonth: MonthlySignups[];
  recentGroups: RecentGroup[];
  recentSignups: RecentSignup[];
};

function monthShortLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    utcDate(year, month, 1),
  );
}

/** The last `count` months, oldest first, ending with the current month. */
function trailingMonths(count: number): YearMonth[] {
  const months: YearMonth[] = [];
  let cursor = currentYearMonth();
  for (let i = 0; i < count; i += 1) {
    months.unshift(cursor);
    cursor = previousMonth(cursor);
  }
  return months;
}

/**
 * Site-wide numbers for the admin dashboard: totals across every group, not
 * scoped to any single one. Reads only — nothing here touches DailyEntry, so
 * it doesn't need to go through mess-service.ts.
 */
export async function getSiteAnalytics(): Promise<SiteAnalytics> {
  const months = trailingMonths(SIGNUP_TREND_MONTHS);
  const trendStart = utcDate(months[0].year, months[0].month, 1);

  const [
    totalUsers,
    totalGroups,
    activeMembers,
    monthTotals,
    openMonths,
    closedMonths,
    recentGroupRows,
    recentSignupRows,
    signupRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.groupMembership.count({ where: { isActive: true } }),
    prisma.monthCycle.aggregate({
      _sum: { cachedTotalCost: true, cachedTotalMeals: true },
    }),
    prisma.monthCycle.count({ where: { isClosed: false } }),
    prisma.monthCycle.count({ where: { isClosed: true } }),
    prisma.group.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          where: { isActive: true },
          select: { role: true, user: { select: { username: true } } },
        },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
  ]);

  const signupCounts = new Map<string, number>();
  for (const { createdAt } of signupRows) {
    const key = `${createdAt.getUTCFullYear()}-${createdAt.getUTCMonth() + 1}`;
    signupCounts.set(key, (signupCounts.get(key) ?? 0) + 1);
  }
  const signupsByMonth = months.map(({ year, month }) => ({
    year,
    month,
    label: monthShortLabel(year, month),
    count: signupCounts.get(`${year}-${month}`) ?? 0,
  }));

  const recentGroups = recentGroupRows.map((group) => ({
    id: group.id,
    name: group.name,
    leaderUsername:
      group.memberships.find((m) => m.role === "LEADER")?.user.username ?? "—",
    activeMembers: group.memberships.length,
    createdAt: group.createdAt,
  }));

  return {
    totalUsers,
    totalGroups,
    activeMembers,
    totalMealsLogged: monthTotals._sum.cachedTotalMeals ?? ZERO,
    totalMoneyTracked: monthTotals._sum.cachedTotalCost ?? ZERO,
    openMonths,
    closedMonths,
    signupsByMonth,
    recentGroups,
    recentSignups: recentSignupRows,
  };
}
