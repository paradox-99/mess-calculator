import Link from "next/link";
import type { Metadata } from "next";

import { TransferLeadershipForm } from "./transfer-form";
import { parseId, requireLeaderGroup } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type PageProps = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));
  return { title: `Transfer leadership — ${group.name}` };
}

export default async function TransferLeadershipPage({ params }: PageProps) {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));

  // Only active plain members can be promoted — same queryset the Django
  // LeadershipTransferForm built.
  const candidates = await prisma.groupMembership.findMany({
    where: { groupId: group.id, isActive: true, role: "MEMBER" },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { user: { username: "asc" } },
  });

  return (
    <section className="mx-auto my-11 max-w-[560px] max-[680px]:my-6">
      <div className="rounded-xl border border-sand bg-parchment px-[clamp(1.5rem,5vw,3rem)] py-9 shadow-[0_18px_45px_rgba(31,35,40,0.08)] max-[680px]:p-6">
        <h1 className="mb-2 text-[clamp(1.8rem,5vw,2.35rem)] text-navy">Transfer leadership</h1>
        <p className="text-muted">
          Choose a member to become the new leader. You will become a normal member immediately.
        </p>
        <TransferLeadershipForm
          groupId={group.id}
          members={candidates.map((membership) => ({
            id: membership.user.id,
            username: membership.user.username,
          }))}
        />
        <Link href={`/mess/${group.id}/dashboard`} className="back-link">
          ← Back to dashboard
        </Link>
      </div>
    </section>
  );
}
