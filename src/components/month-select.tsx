"use client";

import { usePathname, useRouter } from "next/navigation";

export type MonthOption = { value: string; label: string };

/**
 * The month picker from the dashboard and details pages. Changing it navigates
 * to `?month_choice=YYYY-MM`, the same query the Django `<form method="get">`
 * produced — so the page keeps working without JS via the surrounding form.
 */
export function MonthSelect({
  id,
  label,
  options,
  selected,
  className = "",
}: {
  id: string;
  label: string;
  options: MonthOption[];
  selected: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form method="get" action={pathname} className="contents">
      <label className="sr-only absolute -m-px h-px w-px overflow-hidden p-0" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name="month_choice"
        defaultValue={selected}
        onChange={(event) => router.push(`${pathname}?month_choice=${event.target.value}`)}
        className={`min-w-[170px] rounded-md border border-[#b8d5d2] bg-white px-3 py-2 font-bold text-brand ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
