import Link from "next/link";
import type { Metadata } from "next";

import { CloseMonthButton, RemoveMemberButton } from "./dashboard-actions";
import { MonthSelect } from "@/components/month-select";
import {
  compareYearMonth,
  currentYearMonth,
  formatShortDate,
  monthFromParams,
  monthLabel,
  nextMonth,
  previousMonth,
  toISODate,
  today,
} from "@/lib/date";
import { money, plain, pluralize } from "@/lib/format";
import { balanceFor, getOrCreateMonthCycle } from "@/lib/mess-service";
import { monthOptions } from "@/lib/month-page";
import { parseId, requireMemberGroup } from "@/lib/guards";
import { isLeader } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  unpaidUtilityDues,
  utilityStandings,
  type MemberDues,
  type UtilityStanding,
} from "@/lib/utility-service";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, parseId(groupId));
  const month = monthFromParams({
    month_choice: single(query.month_choice),
    year: single(query.year),
    month: single(query.month),
  });
  return { title: `${group.name} — ${monthLabel(month)}` };
}

export default async function DashboardPage({ params, searchParams }: PageProps) {
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

  const [standings, dues] = await Promise.all([
    utilityStandings(
      group.id,
      monthCycle.id,
      memberships.map((membership) => membership.userId),
    ),
    unpaidUtilityDues(
      group.id,
      monthCycle.id,
      memberships.map((membership) => membership.user),
    ),
  ]);
  const rows = await Promise.all(
    memberships.map(async (membership) => ({
      user: membership.user,
      utilities: standings.get(membership.userId) ?? "none",
      ...(await balanceFor(monthCycle, membership.userId)),
    })),
  );

  const viewerIsLeader = await isLeader(user.id, group.id);
  const { options, selectedValue, label } = await monthOptions(group.id, selected);

  const now = currentYearMonth();
  const isCurrentMonth = compareYearMonth(selected, now) === 0;
  const isPastMonth = compareYearMonth(selected, now) < 0;
  const previous = previousMonth(selected);
  const upcoming = nextMonth(selected);
  const closeStatus = single(query.close);

  return (
    <>
      <section className="mx-auto my-11 max-w-[1080px] max-[680px]:my-6">
        <div className="mb-7 flex items-end justify-between gap-4 max-[680px]:flex-col max-[680px]:items-start">
          <div>
            <h1 className="m-0 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em] text-navy">
              {group.name}
            </h1>
          </div>
        </div>

        <nav
          aria-label="Month navigation"
          className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-line bg-brand-panel px-4 py-3 max-[680px]:text-[0.9rem]"
        >
          <Link
            href={`?year=${previous.year}&month=${previous.month}`}
            className="font-semibold text-good no-underline hover:underline"
          >
            ← Previous month
          </Link>
          <MonthSelect
            id="dashboard-month"
            label="Choose month"
            options={options}
            selected={selectedValue}
          />
          {isCurrentMonth ? (
            <span aria-disabled="true" className="cursor-not-allowed font-semibold text-[#aeb7bc]">
              Next month →
            </span>
          ) : (
            <Link
              href={`?year=${upcoming.year}&month=${upcoming.month}`}
              className="font-semibold text-good no-underline hover:underline"
            >
              Next month →
            </Link>
          )}
        </nav>

        <div className="stats mb-6 w-full border border-line bg-base-100 shadow-[0_8px_20px_rgba(23,43,58,0.05)] max-[680px]:stats-vertical">
          <SummaryCard
            accent="border-t-flame"
            valueClass="text-[#c65338]"
            label="Total cost"
            value={plain(monthCycle.cachedTotalCost)}
          />
          <SummaryCard
            accent="border-t-sea"
            valueClass="text-sea-dark"
            label="Total meals"
            value={plain(monthCycle.cachedTotalMeals)}
          />
          <SummaryCard
            accent="border-t-gold"
            valueClass="text-gold-deep"
            label="Meal rate"
            value={plain(monthCycle.cachedMealRate)}
          />
        </div>

        {closeStatus === "closed" ? (
          <div role="status" className="alert alert-success alert-soft mb-4">
            <span>{label} has been closed. Entries can no longer be changed.</span>
          </div>
        ) : null}
        {closeStatus === "not-ready" ? (
          <div role="status" className="alert alert-warning alert-soft mb-4">
            <span>The current month cannot be closed until it has ended.</span>
          </div>
        ) : null}
        {monthCycle.isClosed ? (
          <div role="status" className="alert alert-info alert-soft mb-4">
            <span>
              This month is closed
              {monthCycle.closedAt ? ` on ${formatShortDate(monthCycle.closedAt)}` : ""}.
            </span>
          </div>
        ) : null}

        {dues.length > 0 ? (
          <UnpaidUtilitiesPanel
            dues={dues}
            href={`/mess/${group.id}/utilities?year=${monthCycle.year}&month=${monthCycle.month}`}
          />
        ) : null}

        <section className="panel shadow-[0_10px_24px_rgba(23,43,58,0.05)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
            <h2 className="m-0 text-[1.1rem] text-brand">Member balances</h2>
            <span className="badge badge-ghost badge-sm">
              {rows.length} member{pluralize(rows.length)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table m-0 w-full min-w-[680px] border-collapse text-left max-[680px]:block max-[680px]:min-w-0 max-[680px]:text-[0.88rem]">
              <thead className="max-[680px]:hidden">
                <tr>
                  {["Member", "Cost paid", "Meals", "Due", "Balance", "Utilities", ""].map((heading, index) => (
                    <th
                      key={heading || index}
                      className="border-b border-line bg-brand-wash px-5 py-3.5 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="max-[680px]:block">
                {rows.map((row) => (
                  <tr
                    key={row.user.id}
                    className="max-[680px]:mx-1 max-[680px]:my-1.5 max-[680px]:block max-[680px]:rounded-lg max-[680px]:border max-[680px]:border-l-4 max-[680px]:border-line max-[680px]:border-l-sea max-[680px]:bg-white max-[680px]:px-3 max-[680px]:py-2.5 max-[680px]:shadow-[0_5px_14px_rgba(23,43,58,0.05)]"
                  >
                    <Cell label="Member" className="font-bold">
                      {row.user.username}
                    </Cell>
                    <Cell label="Cost paid">{plain(row.cost)}</Cell>
                    <Cell label="Meals">{plain(row.meals)}</Cell>
                    <Cell label="Due">{money(row.due)}</Cell>
                    <Cell
                      label="Balance"
                      className={row.balance.isNegative() ? "text-bad" : "text-good"}
                    >
                      {money(row.balance)}
                    </Cell>
                    <Cell label="Utilities">
                      <UtilityStatus
                        standing={row.utilities}
                        href={`/mess/${group.id}/utilities?year=${monthCycle.year}&month=${monthCycle.month}`}
                      />
                    </Cell>
                    <td className="border-b border-line px-5 py-3.5 text-right max-[680px]:block max-[680px]:border-b-0 max-[680px]:px-0 max-[680px]:pb-0 max-[680px]:pt-2 max-[680px]:text-left">
                      {viewerIsLeader || row.user.id === user.id ? (
                        <details className="dropdown dropdown-end max-[680px]:dropdown-start">
                          <summary className="btn btn-outline btn-primary btn-xs gap-1 font-semibold">
                            Actions <span aria-hidden="true">▾</span>
                          </summary>
                          <ul className="menu dropdown-content z-10 mt-1 w-44 rounded-(--radius-box) border border-line bg-base-100 p-1.5 text-sm shadow-[0_12px_28px_rgba(23,43,58,0.16)]">
                            <li>
                              <Link
                                href={`/mess/${group.id}/entry/${row.user.id}`}
                                className="font-semibold text-good"
                              >
                                Add meal
                              </Link>
                            </li>
                            <li>
                              <Link
                                href={`/mess/${group.id}/entry/bulk/${row.user.id}`}
                                className="font-semibold text-sea-dark"
                              >
                                Multiple days
                              </Link>
                            </li>
                            {viewerIsLeader ? (
                              <li>
                                <Link
                                  href={`/mess/${group.id}/extra-meal/${row.user.id}`}
                                  className="font-semibold text-gold-deep"
                                >
                                  Extra meal
                                </Link>
                              </li>
                            ) : null}
                            {viewerIsLeader && row.user.id !== user.id ? (
                              <li className="mt-1 border-t border-line pt-1">
                                <RemoveMemberButton
                                  groupId={group.id}
                                  userId={row.user.id}
                                  username={row.user.username}
                                />
                              </li>
                            ) : null}
                          </ul>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p lang="bn" className="mt-3 text-[0.85rem] text-muted">
          (+) ব্যালেন্স মানে সদস্য টাকা ফেরত পাবে। (-) ব্যালেন্স মানে সদস্য গ্রুপকে টাকা দেবে।
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/mess/${group.id}/entry?date=${toISODate(today())}`}
            className="btn btn-accent"
          >
            Add today&apos;s meal status
          </Link>
          <Link
            href={`/mess/${group.id}/details?year=${monthCycle.year}&month=${monthCycle.month}`}
            className="btn btn-warning"
          >
            Daily meal details
          </Link>
          <Link
            href={`/mess/${group.id}/utilities?year=${monthCycle.year}&month=${monthCycle.month}`}
            className="btn btn-info btn-soft"
          >
            {viewerIsLeader ? "Utilities" : "Utility bills"}
          </Link>
          {viewerIsLeader ? (
            <>
              <Link
                href={`/groups/${group.id}/members/add`}
                className="btn btn-secondary"
              >
                Add member
              </Link>
              <Link href={`/mess/${group.id}/logs`} className="btn btn-primary">
                View activity log
              </Link>
              {isPastMonth && !monthCycle.isClosed ? (
                <CloseMonthButton
                  groupId={group.id}
                  year={monthCycle.year}
                  month={monthCycle.month}
                  monthLabel={label}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}

function SummaryCard({
  accent,
  valueClass,
  label,
  value,
}: {
  accent: string;
  valueClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className={`stat border-t-4 ${accent}`}>
      <span className="stat-title text-[0.85rem] text-muted">{label}</span>
      <span className={`stat-value text-[1.45rem] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

const UTILITY_STATUS: Record<UtilityStanding, { className: string; glyph: string; title: string }> = {
  "all-paid": {
    className: "border-check bg-check text-white shadow-[0_3px_8px_rgba(35,132,93,0.25)]",
    glyph: "✓",
    title: "All utilities paid",
  },
  unpaid: {
    className: "border-bad bg-bad text-white shadow-[0_3px_8px_rgba(179,67,43,0.25)]",
    glyph: "✕",
    title: "Utilities still due",
  },
  none: {
    className: "border-[#c7d4d1] bg-[#f5f8f7] text-[#aebbb8]",
    glyph: "·",
    title: "No utilities defined",
  },
};

/**
 * Who still owes which utility bills this month. Only members with something
 * outstanding are listed; the caller hides the panel when nobody does.
 */
function UnpaidUtilitiesPanel({ dues, href }: { dues: MemberDues[]; href: string }) {
  return (
    <section
      aria-label="Unpaid utility bills"
      className="panel mb-6 border-bad-edge shadow-[0_10px_24px_rgba(179,67,43,0.06)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-bad-edge bg-bad-wash px-5 py-[1.1rem] max-[680px]:p-4">
        <h2 className="m-0 text-[1.1rem] text-bad-ink">Unpaid utility bills</h2>
        <Link href={href} className="text-[0.85rem] font-bold text-bad-ink no-underline hover:underline">
          Mark as paid →
        </Link>
      </div>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {dues.map(({ user, unpaid, total }) => (
          <li
            key={user.id}
            className="flex items-start justify-between gap-4 px-5 py-3.5 max-[680px]:flex-col max-[680px]:gap-2 max-[680px]:px-4"
          >
            <div className="min-w-0">
              <span className="font-bold">{user.username}</span>
              <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                {unpaid.map((bill) => (
                  <li key={bill.name} className="badge badge-error badge-soft badge-sm font-semibold">
                    {bill.name}
                    {bill.amount ? `: ${money(bill.amount)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-right max-[680px]:text-left">
              <span className="block text-[0.7rem] font-bold uppercase tracking-[0.04em] text-muted">
                Total due
              </span>
              <span className="text-[1.05rem] font-bold text-bad">{money(total)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Green tick when a member has paid every utility this month, red cross otherwise. */
function UtilityStatus({ standing, href }: { standing: UtilityStanding; href: string }) {
  const { className, glyph, title } = UTILITY_STATUS[standing];
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className={`inline-grid h-[1.7rem] w-[1.7rem] place-items-center rounded-full border text-[0.85rem] font-extrabold no-underline ${className}`}
    >
      {glyph}
    </Link>
  );
}

function Cell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <td
      data-label={label}
      className={`border-b border-line px-5 py-3.5 max-[680px]:flex max-[680px]:items-center max-[680px]:justify-between max-[680px]:gap-4 max-[680px]:border-b-[#eef1ef] max-[680px]:px-0 max-[680px]:py-1 max-[680px]:text-right max-[680px]:before:text-[0.7rem] max-[680px]:before:font-bold max-[680px]:before:uppercase max-[680px]:before:text-muted max-[680px]:before:content-[attr(data-label)] ${className}`}
    >
      {children}
    </td>
  );
}
