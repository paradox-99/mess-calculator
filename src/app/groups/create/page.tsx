import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { GroupCreateForm } from "./group-create-form";
import { activeMembership } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create a group" };

export default async function GroupCreatePage() {
  const user = await requireUser();

  const existing = await activeMembership(user.id);
  if (existing) redirect(`/mess/${existing.groupId}/dashboard`);

  return (
    <section className="mx-auto my-10 max-w-[560px] max-[680px]:my-6">
      <h1 className="mb-4 text-[clamp(1.8rem,5vw,2.35rem)]">Create a group</h1>
      <div className="max-w-[420px]">
        <GroupCreateForm />
      </div>
    </section>
  );
}
