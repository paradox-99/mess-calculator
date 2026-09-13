"use client";

import { useState } from "react";

/**
 * One sitting on the entry forms: the "did you eat this" tile plus a
 * "maid absent" toggle under it. Marking the maid absent unchecks and
 * disables the meal, since nobody can eat a meal that wasn't cooked — the
 * absence itself is saved for the whole group when the form is submitted.
 */
export function MealField({
  name,
  label,
  defaultChecked,
  maidAbsentName,
  defaultMaidAbsent,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  maidAbsentName: string;
  defaultMaidAbsent: boolean;
}) {
  const [maidAbsent, setMaidAbsent] = useState(defaultMaidAbsent);
  const [eaten, setEaten] = useState(defaultChecked && !defaultMaidAbsent);
  const id = `id_${name}`;
  const maidId = `id_${maidAbsentName}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={`flex min-h-[3.25rem] items-center gap-3 rounded-(--radius-field) border border-base-300 bg-base-200 px-4 py-3 transition-[border-color,background] duration-150 has-[input:checked]:border-success has-[input:checked]:bg-good-wash has-[input:checked]:text-good-deep max-[520px]:min-h-[2.5rem] max-[520px]:gap-2 max-[520px]:px-3 max-[520px]:py-1.5 ${
          maidAbsent ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={eaten}
          disabled={maidAbsent}
          onChange={(event) => setEaten(event.target.checked)}
          className="checkbox checkbox-success checkbox-sm max-[520px]:checkbox-xs"
        />
        <span className="font-medium max-[520px]:text-[0.85rem]">{label}</span>
      </label>

      <label
        htmlFor={maidId}
        className={`flex cursor-pointer items-center gap-2 px-1 text-[0.8rem] transition-colors duration-150 ${
          maidAbsent ? "font-semibold text-bad" : "text-muted"
        }`}
      >
        <input
          id={maidId}
          name={maidAbsentName}
          type="checkbox"
          checked={maidAbsent}
          onChange={(event) => {
            setMaidAbsent(event.target.checked);
            if (event.target.checked) setEaten(false);
          }}
          className="checkbox checkbox-error checkbox-xs"
        />
        <span>Maid absent</span>
      </label>
    </div>
  );
}
