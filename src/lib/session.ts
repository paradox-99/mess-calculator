import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** The signed-in user, or null. */
export async function currentUser(): Promise<User | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) return null;
  return prisma.user.findUnique({ where: { id } });
}

/** The signed-in user, or a redirect to the login page — Django's @login_required. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export function displayName(user: Pick<User, "username" | "firstName" | "lastName">): string {
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.username;
}
