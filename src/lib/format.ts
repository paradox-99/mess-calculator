import type { Prisma } from "@/generated/prisma/client";

/** Two decimal places — Django's `|floatformat:2`. */
export function money(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

/** The stored value as-is, matching how Django rendered a Decimal field. */
export function plain(value: Prisma.Decimal): string {
  return value.toString();
}

export function pluralize(count: number, suffix = "s"): string {
  return count === 1 ? "" : suffix;
}
