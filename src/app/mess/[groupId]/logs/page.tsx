import Link from "next/link";
import type { Metadata } from "next";

import { formatTimestamp, toISODate } from "@/lib/date";
import { parseId, requireLeaderGroup } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type PageProps = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));
  return { title: `Activity log — ${group.name}` };
}

const ACTION_LABEL = { CREATE: "Create", UPDATE: "Update" } as const;

export default async function LogsPage({ params }: PageProps) {
  const { groupId } = await params;
  const user = await requireUser();
  // Only the leader sees the audit trail.
  const group = await requireLeaderGroup(user.id, parseId(groupId));

  const logs = await prisma.activityLog.findMany({
    where: { groupId: group.id },
    include: {
      actor: { select: { username: true } },
      targetUser: { select: { username: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  return (
    <section className="mx-auto my-11 max-w-[1100px] max-[680px]:my-6">
      <div className="mb-7 flex items-end justify-between gap-4 max-[680px]:flex-col max-[680px]:items-start">
        <div>
          <h1 className="m-0 text-[clamp(2rem,5vw,2.8rem)] tracking-[-0.03em] text-navy">
            Activity log
          </h1>
          <p className="muted mt-1.5">
            {group.name} — every edit to every member&apos;s entries, newest first.
          </p>
        </div>
        <span className="badge badge-success badge-soft badge-lg whitespace-nowrap font-bold">
          {logs.length} {logs.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <section className="panel">
        <div className="flex items-center gap-3 border-b border-line bg-brand-panel px-5 py-4 max-[680px]:px-4 max-[680px]:py-3.5">
          <strong className="text-brand">Recent changes</strong>
          <span className="text-[0.85rem] text-muted">Audited automatically</span>
        </div>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table m-0 w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr>
                  {["When", "Actor", "Target", "Date", "Action", "Field", "Old", "New"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="border-b border-line bg-brand-wash px-4 py-3.5 text-[0.76rem] font-semibold uppercase tracking-[0.05em] text-muted max-[680px]:px-3 max-[680px]:py-3"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#fffaf0]">
                    <Td className="whitespace-nowrap text-muted">
                      {formatTimestamp(log.timestamp)}
                    </Td>
                    <Td className="font-bold">{log.actor.username}</Td>
                    <Td className="font-bold">{log.targetUser.username}</Td>
                    <Td className="whitespace-nowrap text-muted">{toISODate(log.entryDate)}</Td>
                    <Td>
                      <span className="badge badge-error badge-soft badge-sm font-bold">
                        {ACTION_LABEL[log.action]}
                      </span>
                    </Td>
                    <Td>
                      <span className="badge badge-secondary badge-soft badge-sm font-bold">
                        {log.fieldName}
                      </span>
                    </Td>
                    <Td>{log.oldValue ?? "—"}</Td>
                    <Td className="font-bold">{log.newValue}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-muted">
            No activity has been recorded yet.
          </div>
        )}
      </section>

      <Link href={`/mess/${group.id}/dashboard`} className="back-link">
        ← Back to dashboard
      </Link>
    </section>
  );
}

function Td({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <td
      className={`border-b border-line px-4 py-3.5 text-[#28343c] max-[680px]:px-3 max-[680px]:py-3 ${className}`}
    >
      {children}
    </td>
  );
}
