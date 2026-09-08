import Link from "next/link";
import { notFound } from "next/navigation";

import { DailyEntryForm } from "@/app/mess/[groupId]/entry/daily-entry-form";
import { parseISODate, toISODate, today } from "@/lib/date";
import { requireMemberGroup } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Shared by /mess/[groupId]/entry (log your own) and
 * /mess/[groupId]/entry/[userId] (a leader logging for someone else).
 */
export async function EntryScreen({
  groupId,
  targetUserId,
  dateParam,
}: {
  groupId: number;
  targetUserId?: number;
  dateParam?: string;
}) {
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, groupId);

  const targetUser =
    targetUserId === undefined
      ? user
      : await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) notFound();

  const initialDate = toISODate(parseISODate(dateParam) ?? today());
  const isSelf = targetUser.id === user.id;

  return (
    <section className="mx-auto my-11 max-w-[560px] max-[520px]:my-6">
      <div className="rounded-xl border border-line bg-white px-[clamp(1.5rem,5vw,3rem)] py-10 shadow-[0_18px_45px_rgba(31,35,40,0.08)] max-[520px]:p-7">
        <div>
          <h1 className="m-0 text-[clamp(1.8rem,5vw,2.35rem)] tracking-[-0.03em]">
            {isSelf ? "Log your meal / cost" : `Meal entry for ${targetUser.username}`}
          </h1>
          <p className="muted mb-8 mt-1.5">{group.name}</p>
        </div>

        <DailyEntryForm
          groupId={group.id}
          targetUserId={targetUser.id}
          initialDate={initialDate}
        />

        <Link href={`/mess/${group.id}/dashboard`} className="back-link font-semibold">
          ← Back to dashboard
        </Link>
      </div>
    </section>
  );
}
