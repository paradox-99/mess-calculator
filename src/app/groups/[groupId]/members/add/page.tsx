import Link from "next/link";
import type { Metadata } from "next";

import { AddMemberForm } from "./add-member-form";
import { parseId, requireLeaderGroup } from "@/lib/guards";
import { requireUser } from "@/lib/session";

type PageProps = { params: Promise<{ groupId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));
  return { title: `Add member — ${group.name}` };
}

export default async function AddMemberPage({ params }: PageProps) {
  const { groupId } = await params;
  const user = await requireUser();
  const group = await requireLeaderGroup(user.id, parseId(groupId));

  return (
    <section className="mx-auto my-10 max-w-[560px] max-[680px]:my-6">
      <div className="card border border-line bg-base-100 px-[clamp(1.5rem,5vw,3rem)] py-9 shadow-[0_18px_45px_rgba(31,35,40,0.08)] max-[680px]:p-6">
        <h1 className="mb-1.5 text-[clamp(1.8rem,5vw,2.35rem)] text-navy">Add member</h1>
        <p className="muted">Add someone to {group.name} using their account username.</p>
        <div className="mt-7">
          <AddMemberForm groupId={group.id} />
        </div>
        <Link href={`/mess/${group.id}/dashboard`} className="back-link">
          ← Back to dashboard
        </Link>
      </div>
    </section>
  );
}
