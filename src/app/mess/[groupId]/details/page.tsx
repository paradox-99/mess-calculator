import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";

import { MonthSelect } from "@/components/month-select";
import { dayCell, daysInMonth, monthFromParams, toISODate, utcDate } from "@/lib/date";
import { extraMealsIn, getOrCreateMonthCycle } from "@/lib/mess-service";
import { monthOptions } from "@/lib/month-page";
import { parseId, requireMemberGroup } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, parseId(groupId));
  return { title: `Daily meal details — ${group.name}` };
}

export default async function MealDetailsPage({ params, searchParams }: PageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, parseId(groupId));

  const selected = monthFromParams({
    month_choice: single(query.month_choice),
    year: single(query.year),
    month: single(query.month),
  });
  const monthCycle = await getOrCreateMonthCycle(group.id, selected);

  const memberships = await prisma.groupMembership.findMany({
    where: { groupId: group.id, isActive: true },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { user: { username: "asc" } },
  });
  const members = memberships.map((membership) => membership.user);

  const entries = await prisma.dailyEntry.findMany({
    where: { monthCycleId: monthCycle.id },
    orderBy: [{ date: "asc" }],
  });

  // (date, user) → entry, so each cell in the grid is a direct lookup.
  const entryMap = new Map(
    entries.map((entry) => [`${toISODate(entry.date)}:${entry.userId}`, entry]),
  );

  const extraMeals = new Map(members.map((member) => [member.id, new Prisma.Decimal(0)]));
  for (const entry of entries) {
    const running = extraMeals.get(entry.userId);
    if (!running) continue;
    extraMeals.set(entry.userId, running.plus(extraMealsIn(entry)));
  }

  const rows = Array.from({ length: daysInMonth(selected.year, selected.month) }, (_, index) => {
    const date = utcDate(selected.year, selected.month, index + 1);
    const key = toISODate(date);
    return {
      key,
      ...dayCell(date),
      cells: members.map((member) => entryMap.get(`${key}:${member.id}`) ?? null),
    };
  });

  const { options, selectedValue, label } = await monthOptions(group.id, selected);

  return (
    <section className="mx-auto my-11 max-w-[1080px] max-[680px]:my-6">
      <div className="mb-6 flex items-end justify-between gap-4 max-[680px]:flex-col max-[680px]:items-start">
        <div>
          <h1 className="m-0 text-[clamp(2rem,5vw,2.8rem)] text-navy">Daily meal details</h1>
          <p className="muted mt-1.5">
            {group.name} — every member&apos;s meals for this month.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-brand-wash px-3 py-2 font-bold text-brand">
          {label}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-brand-panel px-4 py-3 max-[680px]:flex-col max-[680px]:items-start">
        <span className="font-bold text-brand">Choose a month</span>
        <MonthSelect
          id="details-month"
          label="Choose a month"
          options={options}
          selected={selectedValue}
          className="max-[680px]:w-full"
        />
      </div>

      <section className="panel">
        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="m-0 w-full min-w-[620px] border-collapse">
              <thead>
                <tr>
                  <th className="border border-line bg-navy px-3 py-3 text-left text-[0.78rem] tracking-[0.04em] text-white">
                    Date
                  </th>
                  {members.map((member) => (
                    <th
                      key={member.id}
                      className="border border-line bg-brand px-3 py-3 text-center text-[0.78rem] tracking-[0.04em] text-white"
                    >
                      <span className="block text-[0.9rem]">{member.username}</span>
                      <span className="mt-1 block text-[0.68rem] font-normal text-[#b7dfe0]">
                        Lunch / Dinner
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="even:bg-[#fbfdfc]">
                    <td className="w-24 whitespace-nowrap border border-line px-3 py-3 font-bold text-muted">
                      {row.day} <span className="muted">{row.weekday}</span>
                    </td>
                    {row.cells.map((entry, index) => (
                      <td
                        key={members[index].id}
                        className="min-w-[8.5rem] border border-line px-3 py-3 text-center align-middle"
                      >
                        <div
                          className="flex justify-center gap-[0.45rem]"
                          aria-label={
                            entry
                              ? `${members[index].username} meals on ${row.key}`
                              : "No meals recorded"
                          }
                        >
                          <MealCheck eaten={entry ? entry.lunch.greaterThan(0) : false} />
                          <MealCheck eaten={entry ? entry.dinner.greaterThan(0) : false} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-muted">
            No meal entries have been recorded for {label}.
          </div>
        )}
      </section>

      <section aria-label="Extra meals by member" className="mt-4 rounded-[10px] border border-sand bg-parchment px-[1.15rem] py-4">
        <h2 className="mb-3 text-base text-gold-ink">Extra meals this month</h2>
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => (
            <span
              key={member.id}
              className="rounded-full bg-gold px-3 py-2 text-[0.85rem] font-bold text-navy"
            >
              {member.username}: {extraMeals.get(member.id)?.toString() ?? "0"}
            </span>
          ))}
        </div>
      </section>

      <Link
        href={`/mess/${group.id}/dashboard?year=${selected.year}&month=${selected.month}`}
        className="back-link"
      >
        ← Back to dashboard
      </Link>
    </section>
  );
}

function MealCheck({ eaten }: { eaten: boolean }) {
  return (
    <span
      className={`inline-grid h-[1.7rem] w-[1.7rem] place-items-center rounded-full border text-[0.85rem] font-extrabold ${
        eaten
          ? "border-check bg-check text-white shadow-[0_3px_8px_rgba(35,132,93,0.25)]"
          : "border-[#c7d4d1] bg-[#f5f8f7] text-[#aebbb8]"
      }`}
    >
      {eaten ? "✓" : "·"}
    </span>
  );
}
