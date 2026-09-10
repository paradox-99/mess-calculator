"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";

import { getDailyEntryValues, saveDailyEntry } from "@/app/actions/mess";
import { DateField } from "@/components/date-field";
import { FieldErrors, MealCheckbox, NonFieldErrors } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";
import type { DailyEntryValues } from "@/lib/mess-service";

export function DailyEntryForm({
  groupId,
  targetUserId,
  initialDate,
  initialValues,
}: {
  groupId: number;
  targetUserId: number;
  initialDate: string;
  initialValues: DailyEntryValues;
}) {
  const [state, formAction] = useActionState(
    saveDailyEntry.bind(null, groupId, targetUserId),
    emptyFormState,
  );

  // Tracks which date the meal/cost fields below are currently showing —
  // picking a new date on the calendar re-fetches that date's own record so
  // the checkboxes and cost never carry another day's values into a save.
  const [prefill, setPrefill] = useState({ date: initialDate, ...initialValues });
  const [isPending, startTransition] = useTransition();

  function handleDateChange(nextDate: string) {
    startTransition(async () => {
      const values = await getDailyEntryValues(groupId, targetUserId, nextDate);
      setPrefill({ date: nextDate, ...values });
    });
  }

  const date = state.values?.date ?? prefill.date;
  const lunchChecked = state.values ? state.values.lunch === "on" : prefill.lunch;
  const dinnerChecked = state.values ? state.values.dinner === "on" : prefill.dinner;
  const costValue = state.values?.cost ?? prefill.cost;
  // Remounts the fields below whenever the shown date changes, since
  // defaultChecked/defaultValue only apply the first time an input mounts.
  const fieldsKey = state.values?.date ?? prefill.date;

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />

      <DateField
        name="date"
        label="Date"
        value={date}
        errors={state.errors?.date}
        onValueChange={handleDateChange}
        className="mb-[1.15rem]"
      />

      <div key={fieldsKey} aria-busy={isPending}>
        <div
          aria-label="Meals eaten"
          className="mb-5 grid grid-cols-2 gap-3 max-[520px]:grid-cols-1"
        >
          <MealCheckbox name="lunch" label="Lunch eaten" defaultChecked={lunchChecked} />
          <MealCheckbox name="dinner" label="Dinner eaten" defaultChecked={dinnerChecked} />
        </div>

        <div className="mb-[1.15rem]">
          <label className="field-label" htmlFor="id_cost">
            Cost
          </label>
          <input
            className={`input w-full max-[520px]:input-sm max-[520px]:text-sm ${state.errors?.cost ? "input-error" : ""}`}
            id="id_cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={costValue}
          />
          <FieldErrors messages={state.errors?.cost} />
        </div>
      </div>

      <SubmitButton className="btn btn-accent btn-lg btn-block max-[520px]:btn-md" pendingLabel="Saving…">
        Save entry
      </SubmitButton>
    </form>
  );
}
