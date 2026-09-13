import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";

import {
  AddUtilityForm,
  CopyFromPreviousMonthButton,
  PaidToggle,
  UtilityTypeEditor,
  type UtilityDefaults,
} from "./utility-forms";
import { MonthSelect } from "@/components/month-select";
import { monthFromParams } from "@/lib/date";
import { money, pluralize } from "@/lib/format";
import { getOrCreateMonthCycle } from "@/lib/mess-service";
import { monthOptions } from "@/lib/month-page";
import { parseId, requireMemberGroup } from "@/lib/guards";
import { isLeader } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  amountFor,
  latestEarlierBill,
  monthlyUtilities,
  paidUtilityKeys,
  type MonthlyUtility,
  type UtilityBillWithShares,
} from "@/lib/utility-service";

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
  return { title: `Utilities — ${group.name}` };
}

export default async function UtilitiesPage({ params, searchParams }: PageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, parseId(groupId));

  const selected = monthFromParams({
    month_choice: single(query.month_choice),
    year: single(query.year),
    month: single(query.month),
  });
  const monthCycle = await getOrCreateMonthCycle(group.id, selected);
  const viewerIsLeader = await isLeader(user.id, group.id);

  const [memberships, utilities, paid, { options, selectedValue, label }] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId: group.id, isActive: true },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { user: { username: "asc" } },
    }),
    monthlyUtilities(group.id, monthCycle.id),
    paidUtilityKeys(monthCycle.id),
    monthOptions(group.id, selected),
  ]);
  const members = memberships.map((membership) => membership.user);
  const types = utilities.map(({ type }) => type);

  const rows = members.map((member) => {
    const paidCount = types.filter((type) => paid.has(`${type.id}:${member.id}`)).length;
    return { member, paidCount, allPaid: types.length > 0 && paidCount === types.length };
  });

  // For the leader: utilities with no bill this month get their editor
  // prefilled from the latest earlier month, and a one-click copy for all.
  const unset = utilities.filter(({ bill }) => bill === null);
  const editors = viewerIsLeader
    ? await Promise.all(
        utilities.map(async ({ type, bill }) => {
          if (bill) return { type, defaults: editorDefaults(type.name, bill) };
          const earlier = await latestEarlierBill(type.id, selected);
          return {
            type,
            defaults: earlier
              ? { ...editorDefaults(type.name, earlier.bill), prefilledFrom: earlier.monthLabel }
              : editorDefaults(type.name, null),
          };
        }),
      )
    : [];
  const canCopyForward = unset.length > 0 && editors.some((e) => e.defaults.prefilledFrom);

  return (
    <section className="mx-auto my-11 max-w-[1080px] max-[680px]:my-6">
      <div className="mb-6 flex items-end justify-between gap-4 max-[680px]:flex-col max-[680px]:items-start">
        <div>
          <h1 className="m-0 text-[clamp(2rem,5vw,2.8rem)] text-navy">Utilities</h1>
          <p className="muted mt-1.5">
            {group.name} — who has paid which bill this month.
          </p>
        </div>
        <span className="badge badge-primary badge-soft badge-lg whitespace-nowrap font-bold">
          {label}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-brand-panel px-4 py-3 max-[680px]:flex-col max-[680px]:items-start">
        <span className="font-bold text-brand">Choose a month</span>
        <MonthSelect
          id="utilities-month"
          label="Choose a month"
          options={options}
          selected={selectedValue}
          className="max-[680px]:w-full"
        />
      </div>

      <section className="panel mb-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
          <h2 className="m-0 text-[1.1rem] text-brand">Payments for {label}</h2>
          <span className="badge badge-ghost badge-sm">
            {rows.length} member{pluralize(rows.length)}
          </span>
        </div>

        {types.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table m-0 w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-line bg-brand-wash px-5 py-3.5 text-left text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted">
                    Member
                  </th>
                  {utilities.map(({ type, bill }) => (
                    <th
                      key={type.id}
                      className="border-b border-line bg-brand-wash px-3 py-3.5 text-center text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted"
                    >
                      <span className="block">{type.name}</span>
                      <span className="block text-[0.7rem] font-normal normal-case tracking-normal">
                        {billSummary(bill)}
                      </span>
                    </th>
                  ))}
                  <th className="border-b border-line bg-brand-wash px-3 py-3.5 text-center text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, paidCount, allPaid }) => {
                  const canEdit = viewerIsLeader || member.id === user.id;
                  return (
                    <tr key={member.id} className="even:bg-[#fbfdfc]">
                      <td className="border-b border-line px-5 py-3.5 font-bold">
                        {member.username}
                        {member.id === user.id ? (
                          <span className="ml-1.5 text-[0.75rem] font-normal text-muted">(you)</span>
                        ) : null}
                      </td>
                      {utilities.map(({ type, bill }) => (
                        <td
                          key={type.id}
                          className="border-b border-line px-3 py-3.5 text-center align-middle"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <PaidToggle
                              groupId={group.id}
                              utilityTypeId={type.id}
                              userId={member.id}
                              year={monthCycle.year}
                              month={monthCycle.month}
                              paid={paid.has(`${type.id}:${member.id}`)}
                              canEdit={canEdit}
                              label={`${member.username} paid ${type.name}`}
                            />
                            <span className="text-[0.75rem] text-muted">
                              {formatAmount(amountFor(bill, member.id))}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="border-b border-line px-3 py-3.5 text-center align-middle">
                        <span
                          className={`badge badge-sm badge-soft font-bold ${
                            allPaid ? "badge-success" : "badge-error"
                          }`}
                        >
                          {paidCount}/{types.length} paid
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-muted">
            Nothing to pay until a utility is added.
          </div>
        )}
      </section>

      <section className="panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
          <h2 className="m-0 text-[1.1rem] text-brand">Utilities for {label}</h2>
          <span className="badge badge-ghost badge-sm">
            {types.length} utilit{types.length === 1 ? "y" : "ies"}
          </span>
        </div>

        {viewerIsLeader && canCopyForward ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand bg-parchment px-5 py-3 text-[0.85rem] text-gold-ink max-[680px]:px-4">
            <span>
              {unset.length} utilit{unset.length === 1 ? "y has" : "ies have"} no amount set for{" "}
              {label} yet. Bills change month to month, so each one needs confirming.
            </span>
            <CopyFromPreviousMonthButton
              groupId={group.id}
              month={selected}
              unsetCount={unset.length}
            />
          </div>
        ) : null}

        {types.length > 0 ? (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {viewerIsLeader
              ? editors.map(({ type, defaults }) => (
                  <li key={type.id} className="px-5 py-4 max-[680px]:px-4">
                    <UtilityTypeEditor
                      groupId={group.id}
                      utilityTypeId={type.id}
                      month={selected}
                      members={members}
                      defaults={defaults}
                    />
                  </li>
                ))
              : utilities.map(({ type, bill }) => (
                  <li
                    key={type.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 max-[680px]:px-4"
                  >
                    <span className="font-bold">{type.name}</span>
                    <span className="text-muted">
                      {formatAmount(amountFor(bill, user.id))}{" "}
                      <span className="text-[0.8rem]">
                        {bill ? (bill.sameForAll ? "each" : "your share") : "this month"}
                      </span>
                    </span>
                  </li>
                ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center text-muted">
            {viewerIsLeader
              ? "No utilities yet. Add the first one below."
              : "The leader hasn't added any utilities yet."}
          </div>
        )}

        {viewerIsLeader ? (
          <div className="border-t border-line bg-brand-panel px-5 py-4 max-[680px]:px-4">
            <AddUtilityForm groupId={group.id} month={selected} members={members} />
          </div>
        ) : null}
      </section>

      <p className="mt-3 text-[0.85rem] text-muted">
        {viewerIsLeader
          ? "You can tick payments for anyone. Members can only tick their own."
          : "Tick a utility once you've paid it. Only the leader can change the utilities and their amounts, which are set month by month."}
      </p>

      <Link
        href={`/mess/${group.id}/dashboard?year=${monthCycle.year}&month=${monthCycle.month}`}
        className="back-link"
      >
        ← Back to dashboard
      </Link>
    </section>
  );
}

/** "Not set" for a member the leader hasn't priced yet on an individual bill. */
function formatAmount(amount: Prisma.Decimal | null): string {
  return amount ? money(amount) : "Not set";
}

/** Column subtitle: "350.00 each", "per member", or "not set". */
function billSummary(bill: MonthlyUtility["bill"]): string {
  if (!bill) return "not set";
  return bill.sameForAll ? `${formatAmount(bill.amount)} each` : "per member";
}

/** Decimals → strings so the editor (a Client Component) can take them as props. */
function editorDefaults(name: string, bill: UtilityBillWithShares | null): UtilityDefaults {
  if (!bill) return { name, split: "same", amount: "", amounts: {} };
  return {
    name,
    split: bill.sameForAll ? "same" : "individual",
    amount: bill.amount?.toString() ?? "",
    amounts: Object.fromEntries(bill.shares.map((row) => [row.userId, row.amount.toString()])),
  };
}
