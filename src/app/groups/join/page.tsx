import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { GroupJoinForm } from "./group-join-form";
import { activeMembership } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Join a group" };

export default async function GroupJoinPage() {
  const user = await requireUser();

  const existing = await activeMembership(user.id);
  if (existing) redirect(`/mess/${existing.groupId}/dashboard`);

  return (
    <section className="mx-auto my-10 max-w-[560px] max-[680px]:my-6">
      <h1 className="mb-1.5 text-[clamp(1.8rem,5vw,2.35rem)]">Join a group</h1>
      <p className="muted mb-4">Ask the group leader for the invite code.</p>
      <div className="max-w-[420px]">
        <GroupJoinForm />
      </div>
    </section>
  );
}
