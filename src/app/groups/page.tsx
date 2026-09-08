import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your groups" };

export default async function GroupListPage() {
  const user = await requireUser();

  const memberships = await prisma.groupMembership.findMany({
    where: { userId: user.id, isActive: true },
    include: { group: true },
    orderBy: { id: "asc" },
  });

  // A user belongs to at most one group, so when they have one this page is
  // just a hop to its dashboard.
  if (memberships.length > 0) redirect(`/mess/${memberships[0].groupId}/dashboard`);

  return (
    <section className="mx-auto my-10 max-w-[820px] max-[680px]:my-6">
      <div className="mb-7">
        <h1 className="mb-1.5 text-[clamp(2rem,5vw,2.8rem)] tracking-[-0.03em]">Your groups</h1>
        <p className="muted m-0">Keep your shared meals and balances in one place.</p>
      </div>

      <div className="rounded-[10px] border border-dashed border-[#b8c5c2] bg-[#f7fbf8] p-8">
        <strong className="mb-1.5 block text-navy">You&apos;re not in a group yet.</strong>
        <p className="muted m-0">Create a new mess or use an invite code to join one.</p>
      </div>

      <p className="mt-6 flex flex-wrap gap-2.5">
        <Link href="/groups/create" className="btn max-[680px]:flex-[1_1_100%] max-[680px]:text-center">
          Create a group
        </Link>
        <Link href="/groups/join" className="btn max-[680px]:flex-[1_1_100%] max-[680px]:text-center">
          Join a group
        </Link>
      </p>
    </section>
  );
}
