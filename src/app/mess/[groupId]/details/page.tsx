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

  const [entries, maidAbsences] = await Promise.all([
    prisma.dailyEntry.findMany({
      where: { monthCycleId: monthCycle.id },
      orderBy: [{ date: "asc" }],
    }),
    prisma.maidAbsence.findMany({
      where: { monthCycleId: monthCycle.id },
      select: { date: true, lunch: true, dinner: true },
    }),
  ]);

  // (date, user) → entry, so each cell in the grid is a direct lookup.
  const entryMap = new Map(
    entries.map((entry) => [`${toISODate(entry.date)}:${entry.userId}`, entry]),
  );
  // date → which sittings the maid skipped; the same for every member.
  const absenceMap = new Map(
    maidAbsences.map((absence) => [toISODate(absence.date), absence]),
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
      maidAbsent: absenceMap.get(key) ?? { lunch: false, dinner: false },
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
        <span className="badge badge-primary badge-soft badge-lg whitespace-nowrap font-bold">
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
            <table className="table m-0 w-full min-w-[620px] border-collapse">
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
                          <MealCheck
                            status={mealStatus(entry?.lunch, row.maidAbsent.lunch)}
                            title={`Lunch${row.maidAbsent.lunch ? " — maid absent" : ""}`}
                          />
                          <MealCheck
                            status={mealStatus(entry?.dinner, row.maidAbsent.dinner)}
                            title={`Dinner${row.maidAbsent.dinner ? " — maid absent" : ""}`}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[0.8rem] text-muted">
              <span className="flex items-center gap-2">
                <MealCheck status="eaten" title="Eaten" /> Eaten
              </span>
              <span className="flex items-center gap-2">
                <MealCheck status="skipped" title="Not eaten" /> Not eaten
              </span>
              <span className="flex items-center gap-2">
                <MealCheck status="maid-absent" title="Maid absent" /> Maid absent
              </span>
            </div>
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-muted">
            No meal entries have been recorded for {label}.
          </div>
        )}
      </section>

      <section
        aria-label="Extra meals by member"
        className="card mt-4 border border-sand bg-parchment px-[1.15rem] py-4"
      >
        <h2 className="mb-3 text-base text-gold-ink">Extra meals this month</h2>
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => (
            <span
              key={member.id}
              className="badge badge-warning badge-lg font-bold text-navy"
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

type MealStatus = "eaten" | "skipped" | "maid-absent";

function mealStatus(meal: Prisma.Decimal | undefined, maidAbsent: boolean): MealStatus {
  if (maidAbsent) return "maid-absent";
  return meal?.greaterThan(0) ? "eaten" : "skipped";
}

const MEAL_CHECK_STYLE: Record<MealStatus, { className: string; glyph: string }> = {
  eaten: {
    className: "border-check bg-check text-white shadow-[0_3px_8px_rgba(35,132,93,0.25)]",
    glyph: "✓",
  },
  skipped: { className: "border-[#c7d4d1] bg-[#f5f8f7] text-[#aebbb8]", glyph: "·" },
  "maid-absent": {
    className: "border-bad bg-bad text-white shadow-[0_3px_8px_rgba(179,67,43,0.25)]",
    glyph: "✕",
  },
};

function MealCheck({ status, title }: { status: MealStatus; title: string }) {
  const { className, glyph } = MEAL_CHECK_STYLE[status];
  return (
    <span
      title={title}
      className={`inline-grid h-[1.7rem] w-[1.7rem] place-items-center rounded-full border text-[0.85rem] font-extrabold ${className}`}
    >
      {glyph}
    </span>
  );
}
