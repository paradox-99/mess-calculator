import Link from "next/link";
import type { Metadata } from "next";

import { monthFromParams, monthLabel } from "@/lib/date";
import { money, plain } from "@/lib/format";
import { balanceFor, getOrCreateMonthCycle } from "@/lib/mess-service";
import { parseId, requireMemberGroup } from "@/lib/guards";
import { requireUser } from "@/lib/session";

type PageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const month = monthFromParams({
    month_choice: single(query.month_choice),
    year: single(query.year),
    month: single(query.month),
  });
  return { title: `My calculation — ${monthLabel(month)}` };
}

export default async function PersonalCalculationPage({ params, searchParams }: PageProps) {
  const [{ groupId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, parseId(groupId));

  const selected = monthFromParams({
    month_choice: single(query.month_choice),
    year: single(query.year),
    month: single(query.month),
  });
  const monthCycle = await getOrCreateMonthCycle(group.id, selected);
  const summary = await balanceFor(monthCycle, user.id);

  const cards = [
    { label: "Meals eaten", value: plain(summary.meals), accent: "border-t-sea" },
    { label: "Cost paid", value: plain(summary.cost), accent: "border-t-flame" },
    { label: "Amount due", value: money(summary.due), accent: "border-t-gold" },
    { label: "Balance", value: money(summary.balance), accent: "border-t-brand" },
  ];

  return (
    <section className="mx-auto my-11 max-w-[820px] max-[680px]:my-6">
      <div>
        <h1 className="m-0 text-[clamp(2rem,5vw,2.8rem)] text-navy">My calculation</h1>
        <p className="muted mb-7 mt-2">
          {group.name} — <span className="font-bold text-brand">{monthLabel(selected)}</span>
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 max-[680px]:grid-cols-2 max-[680px]:gap-3 max-[420px]:grid-cols-1">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`stats border border-line border-t-4 ${card.accent} bg-base-100 shadow-[0_8px_20px_rgba(23,43,58,0.05)]`}
          >
            <div className="stat p-5">
              <span className="stat-title text-[0.85rem] text-muted">{card.label}</span>
              <span className="stat-value mt-1.5 text-2xl text-navy">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-muted">
        A positive balance means money is owed back to you. A negative balance means you owe the
        group.
      </p>

      <Link
        href={`/mess/${group.id}/dashboard?year=${selected.year}&month=${selected.month}`}
        className="back-link"
      >
        ← Back to dashboard
      </Link>
    </section>
  );
}
