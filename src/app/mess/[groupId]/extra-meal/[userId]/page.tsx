import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ExtraMealForm } from "./extra-meal-form";
import { toISODate, today } from "@/lib/date";
import { parseId, requireLeaderGroup } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type PageProps = { params: Promise<{ groupId: string; userId: string }> };

export const metadata: Metadata = { title: "Add extra meal" };

export default async function ExtraMealPage({ params }: PageProps) {
  const { groupId, userId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));

  // Extra meals can only be added for someone actually in the group.
  const targetUser = await prisma.user.findFirst({
    where: {
      id: parseId(userId),
      memberships: { some: { groupId: group.id, isActive: true } },
    },
  });
  if (!targetUser) notFound();

  return (
    <section className="mx-auto my-11 max-w-[560px] max-[680px]:my-6">
      <div className="rounded-xl border border-sand bg-parchment px-[clamp(1.5rem,5vw,3rem)] py-10 shadow-[0_18px_45px_rgba(31,35,40,0.08)] max-[680px]:p-7">
        <h1 className="m-0 text-[clamp(1.8rem,5vw,2.35rem)] text-navy">Add extra meal</h1>
        <p className="mb-7 mt-2 text-muted">
          Add an additional meal for <strong>{targetUser.username}</strong> in {group.name}.
        </p>

        <ExtraMealForm
          groupId={group.id}
          targetUserId={targetUser.id}
          initialDate={toISODate(today())}
        />

        <Link href={`/mess/${group.id}/dashboard`} className="back-link">
          ← Back to dashboard
        </Link>
      </div>
    </section>
  );
}
