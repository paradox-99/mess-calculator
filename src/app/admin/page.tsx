import Link from "next/link";
import type { Metadata } from "next";

import { getSiteAnalytics } from "@/lib/admin-analytics";
import { formatShortDate } from "@/lib/date";
import { money, plain, pluralize } from "@/lib/format";
import { requireSuperuser } from "@/lib/guards";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const user = await requireUser();
  requireSuperuser(user);

  const analytics = await getSiteAnalytics();
  const maxSignups = Math.max(1, ...analytics.signupsByMonth.map((m) => m.count));

  return (
    <section className="mx-auto my-11 max-w-[1080px] max-[680px]:my-6">
      <div className="mb-7">
        <h1 className="m-0 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em] text-navy">
          Admin dashboard
        </h1>
        <p className="muted mt-1.5">Site-wide numbers across every mess group.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
        <StatCard accent="border-t-brand" valueClass="text-brand" label="Total users" value={String(analytics.totalUsers)} />
        <StatCard accent="border-t-sea" valueClass="text-sea-dark" label="Total groups" value={String(analytics.totalGroups)} />
        <StatCard
          accent="border-t-gold"
          valueClass="text-gold-deep"
          label="Active members"
          value={String(analytics.activeMembers)}
        />
        <StatCard
          accent="border-t-flame"
          valueClass="text-[#c65338]"
          label="Meals logged (all-time)"
          value={plain(analytics.totalMealsLogged)}
        />
        <StatCard
          accent="border-t-good"
          valueClass="text-good-deep"
          label="Money tracked (all-time)"
          value={money(analytics.totalMoneyTracked)}
        />
        <StatCard
          accent="border-t-sea"
          valueClass="text-sea-dark"
          label="Open months"
          value={String(analytics.openMonths)}
        />
        <StatCard
          accent="border-t-brand"
          valueClass="text-brand"
          label="Closed months"
          value={String(analytics.closedMonths)}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="panel">
          <div className="border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
            <h2 className="m-0 text-[1.1rem] text-brand">New signups by month</h2>
          </div>
          <div className="divide-y divide-line">
            {analytics.signupsByMonth.map((m) => (
              <div
                key={`${m.year}-${m.month}`}
                className="flex items-center gap-3 px-5 py-2.5 max-[680px]:px-4"
              >
                <span className="w-10 shrink-0 text-[0.8rem] font-semibold text-muted">
                  {m.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-sea-wash">
                  <div
                    className="h-full rounded-full bg-sea-dark"
                    style={{ width: `${(m.count / maxSignups) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[0.85rem] font-bold text-ink">
                  {m.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
            <h2 className="m-0 text-[1.1rem] text-brand">Recent signups</h2>
            <span className="badge badge-ghost badge-sm">
              {analytics.recentSignups.length} shown
            </span>
          </div>
          {analytics.recentSignups.length > 0 ? (
            <ul className="divide-y divide-line">
              {analytics.recentSignups.map((signup) => (
                <li
                  key={signup.id}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 max-[680px]:px-4"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-bold text-ink">{signup.username}</p>
                    <p className="muted m-0 truncate text-[0.8rem]">{signup.email}</p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[0.8rem] text-muted">
                    {formatShortDate(signup.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-muted">No users yet.</div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-[1.1rem] max-[680px]:p-4">
          <h2 className="m-0 text-[1.1rem] text-brand">Recent groups</h2>
          <span className="badge badge-ghost badge-sm">
            {analytics.recentGroups.length} shown
          </span>
        </div>
        {analytics.recentGroups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table m-0 w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr>
                  {["Group", "Leader", "Active members", "Created"].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-line bg-brand-wash px-5 py-3.5 text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.recentGroups.map((group) => (
                  <tr key={group.id}>
                    <td className="border-b border-line px-5 py-3.5 font-bold text-ink">
                      {group.name}
                    </td>
                    <td className="border-b border-line px-5 py-3.5 text-[#28343c]">
                      {group.leaderUsername}
                    </td>
                    <td className="border-b border-line px-5 py-3.5 text-[#28343c]">
                      {group.activeMembers} member{pluralize(group.activeMembers)}
                    </td>
                    <td className="border-b border-line px-5 py-3.5 whitespace-nowrap text-muted">
                      {formatShortDate(group.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-muted">No groups yet.</div>
        )}
      </section>

      <Link href="/" className="back-link">
        ← Back home
      </Link>
    </section>
  );
}

function StatCard({
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
    <div className={`stat rounded-box border border-line border-t-4 bg-base-100 px-4 py-3.5 shadow-[0_8px_20px_rgba(23,43,58,0.05)] ${accent}`}>
      <span className="stat-title block text-[0.78rem] text-muted">{label}</span>
      <span className={`stat-value block text-[1.35rem] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}
