"use client";

import { useActionState } from "react";

import { saveExtraMeal } from "@/app/actions/mess";
import { DateField } from "@/components/date-field";
import { FieldErrors, NonFieldErrors } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function ExtraMealForm({
  groupId,
  targetUserId,
  initialDate,
}: {
  groupId: number;
  targetUserId: number;
  initialDate: string;
}) {
  const [state, formAction] = useActionState(
    saveExtraMeal.bind(null, groupId, targetUserId),
    emptyFormState,
  );

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />

      <DateField
        name="date"
        label="Date"
        value={state.values?.date ?? initialDate}
        errors={state.errors?.date}
      />

      <div className="mb-4">
        <label className="field-label" htmlFor="id_mealType">
          Meal type
        </label>
        <select
          className={`select w-full ${state.errors?.mealType ? "select-error" : ""}`}
          id="id_mealType"
          name="mealType"
          defaultValue={state.values?.mealType ?? "lunch"}
        >
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
        <FieldErrors messages={state.errors?.mealType} />
      </div>

      <div className="mb-4">
        <label className="field-label" htmlFor="id_quantity">
          Extra meals
        </label>
        <input
          className={`input w-full ${state.errors?.quantity ? "input-error" : ""}`}
          id="id_quantity"
          name="quantity"
          type="number"
          step="0.1"
          min="0.1"
          max="9.9"
          required
          defaultValue={state.values?.quantity ?? "1"}
        />
        <FieldErrors messages={state.errors?.quantity} />
      </div>

      <SubmitButton
        className="btn btn-accent btn-lg btn-block mt-2"
        pendingLabel="Adding…"
      >
        Add extra meal
      </SubmitButton>
    </form>
  );
}
