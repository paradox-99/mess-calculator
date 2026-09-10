import type { Metadata } from "next";

import { BulkEntryScreen } from "@/components/bulk-entry-screen";
import { parseId } from "@/lib/guards";

export const metadata: Metadata = { title: "Log multiple days" };

export default async function BulkEntrySelfPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <BulkEntryScreen groupId={parseId(groupId)} />;
}
