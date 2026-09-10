import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { BulkEntryForm } from "@/app/mess/[groupId]/entry/bulk/bulk-entry-form";
import { requireMemberGroup } from "@/lib/guards";
import { canEditEntry } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Shared by /mess/[groupId]/entry/bulk (log your own) and
 * /mess/[groupId]/entry/bulk/[userId] (a leader logging for someone else) —
 * the multi-day counterpart to EntryScreen.
 */
export async function BulkEntryScreen({
  groupId,
  targetUserId,
}: {
  groupId: number;
  targetUserId?: number;
}) {
  const user = await requireUser();
  const group = await requireMemberGroup(user.id, groupId);

  const targetUser =
    targetUserId === undefined
      ? user
      : await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) notFound();
  if (!(await canEditEntry(user.id, groupId, targetUser.id))) forbidden();

  const isSelf = targetUser.id === user.id;

  return (
    <section className="mx-auto my-11 max-w-[680px] max-[520px]:my-6">
      <div className="card border border-line bg-base-100 px-[clamp(1.5rem,5vw,3rem)] py-10 shadow-[0_18px_45px_rgba(31,35,40,0.08)] max-[520px]:p-7">
        <div>
          <h1 className="m-0 text-[clamp(1.8rem,5vw,2.35rem)] tracking-[-0.03em] max-[520px]:text-[1.4rem]">
            {isSelf ? "Log multiple days" : `Multiple days for ${targetUser.username}`}
          </h1>
          <p className="muted mb-8 mt-1.5">{group.name}</p>
        </div>

        <BulkEntryForm groupId={group.id} targetUserId={targetUser.id} />

        <Link href={`/mess/${group.id}/dashboard`} className="back-link font-semibold">
          ← Back to dashboard
        </Link>
      </div>
    </section>
  );
}
