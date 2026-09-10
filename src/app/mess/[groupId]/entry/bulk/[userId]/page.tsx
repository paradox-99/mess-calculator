import type { Metadata } from "next";

import { BulkEntryScreen } from "@/components/bulk-entry-screen";
import { parseId } from "@/lib/guards";

export const metadata: Metadata = { title: "Log multiple days" };

export default async function BulkEntryForUserPage({
  params,
}: {
  params: Promise<{ groupId: string; userId: string }>;
}) {
  const { groupId, userId } = await params;
  return <BulkEntryScreen groupId={parseId(groupId)} targetUserId={parseId(userId)} />;
}
