"use client";

import { useActionState } from "react";

import { saveDailyEntry } from "@/app/actions/mess";
import { FieldErrors, NonFieldErrors } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function DailyEntryForm({
  groupId,
  targetUserId,
  initialDate,
}: {
  groupId: number;
  targetUserId: number;
  initialDate: string;
}) {
  const [state, formAction] = useActionState(
    saveDailyEntry.bind(null, groupId, targetUserId),
    emptyFormState,
  );

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />

      <p className="mb-[1.15rem]">
        <label className="field-label" htmlFor="id_date">
          Date
        </label>
        <input
          className="field-input"
          id="id_date"
          name="date"
          type="date"
          required
          defaultValue={state.values?.date ?? initialDate}
        />
        <FieldErrors messages={state.errors?.date} />
      </p>

      <div aria-label="Meals eaten" className="mb-5 grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <MealOption
          name="lunch"
          label="Lunch eaten"
          defaultChecked={state.values ? state.values.lunch === "on" : false}
        />
        <MealOption
          name="dinner"
          label="Dinner eaten"
          defaultChecked={state.values ? state.values.dinner === "on" : false}
        />
      </div>

      <p className="mb-[1.15rem]">
        <label className="field-label" htmlFor="id_cost">
          Cost
        </label>
        <input
          className="field-input"
          id="id_cost"
          name="cost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={state.values?.cost ?? "0"}
        />
        <FieldErrors messages={state.errors?.cost} />
      </p>

      <SubmitButton
        className="btn w-full rounded-md bg-rust py-3 font-bold transition hover:-translate-y-px hover:bg-rust-dark"
        pendingLabel="Saving…"
      >
        Save entry
      </SubmitButton>
    </form>
  );
}

function MealOption({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={`id_${name}`}
      className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-[7px] border border-[#c6ccd1] bg-[#fcfcfa] px-4 py-3 transition-[border-color,background] duration-150 has-[input:checked]:border-good has-[input:checked]:bg-good-wash has-[input:checked]:text-good-deep"
    >
      <input
        id={`id_${name}`}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-[1.15rem] w-[1.15rem] accent-good"
      />
      <span>{label}</span>
    </label>
  );
}
