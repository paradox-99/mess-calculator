"use client";

import { useActionState } from "react";

import { saveExtraMeal } from "@/app/actions/mess";
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

      <p className="mb-4">
        <label className="field-label" htmlFor="id_date">
          Date
        </label>
        <input
          className="field-input bg-white"
          id="id_date"
          name="date"
          type="date"
          required
          defaultValue={state.values?.date ?? initialDate}
        />
        <FieldErrors messages={state.errors?.date} />
      </p>

      <p className="mb-4">
        <label className="field-label" htmlFor="id_mealType">
          Meal type
        </label>
        <select
          className="field-input bg-white"
          id="id_mealType"
          name="mealType"
          defaultValue={state.values?.mealType ?? "lunch"}
        >
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
        <FieldErrors messages={state.errors?.mealType} />
      </p>

      <p className="mb-4">
        <label className="field-label" htmlFor="id_quantity">
          Extra meals
        </label>
        <input
          className="field-input bg-white"
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
      </p>

      <SubmitButton
        className="btn mt-2 w-full rounded-md bg-rust py-3 font-bold hover:bg-rust-dark"
        pendingLabel="Adding…"
      >
        Add extra meal
      </SubmitButton>
    </form>
  );
}
