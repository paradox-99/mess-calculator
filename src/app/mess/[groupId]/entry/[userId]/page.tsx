import type { Metadata } from "next";

import { EntryScreen } from "@/components/entry-screen";
import { parseId } from "@/lib/guards";

export const metadata: Metadata = { title: "Log entry" };

export default async function EntryForUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; userId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ groupId, userId }, { date }] = await Promise.all([params, searchParams]);
  return (
    <EntryScreen groupId={parseId(groupId)} targetUserId={parseId(userId)} dateParam={date} />
  );
}
