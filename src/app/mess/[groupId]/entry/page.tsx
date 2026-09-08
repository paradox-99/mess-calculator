import type { Metadata } from "next";

import { EntryScreen } from "@/components/entry-screen";
import { parseId } from "@/lib/guards";

export const metadata: Metadata = { title: "Log entry" };

export default async function EntrySelfPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ groupId }, { date }] = await Promise.all([params, searchParams]);
  return <EntryScreen groupId={parseId(groupId)} dateParam={date} />;
}
