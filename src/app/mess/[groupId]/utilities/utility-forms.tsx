"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";

import {
  copyBillsFromPreviousMonth,
  createUtilityType,
  removeUtilityType,
  setUtilityPaid,
  updateUtilityBill,
} from "@/app/actions/utilities";
import { ConfirmForm } from "@/components/confirm-form";
import { FieldErrors, NonFieldErrors } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import type { YearMonth } from "@/lib/date";
import { emptyFormState, type FormState } from "@/lib/form";

const INPUT = "input input-sm w-full max-[520px]:text-sm";

export type UtilityMember = { id: number; username: string };

export type UtilityDefaults = {
  name: string;
  split: "same" | "individual";
  amount: string;
  /** userId → amount, for the individual split. */
  amounts: Record<number, string>;
  /**
   * Set when this month has no bill yet and the figures above were copied
   * from an earlier month — the editor says so, since nothing is saved
   * until the leader confirms.
   */
  prefilledFrom?: string;
};

const EMPTY_DEFAULTS: UtilityDefaults = { name: "", split: "same", amount: "", amounts: {} };

/**
 * Name, the "same for everyone / set per member" choice, and the matching
 * amount input(s). Field names are what parseUtilityForm() in the action
 * reads: `amount` for a shared figure, `amount_<userId>` per member.
 */
function UtilityFields({
  idPrefix,
  members,
  state,
  defaults,
}: {
  idPrefix: string;
  members: UtilityMember[];
  state: FormState;
  defaults: UtilityDefaults;
}) {
  const values = state.values;
  const initialSplit = values?.split === "individual" ? "individual" : values ? "same" : defaults.split;
  const [split, setSplit] = useState<"same" | "individual">(initialSplit);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_12rem] gap-3 max-[520px]:grid-cols-1">
        <div>
          <label className="field-label" htmlFor={`${idPrefix}_name`}>
            Utility name
          </label>
          <input
            id={`${idPrefix}_name`}
            name="name"
            type="text"
            maxLength={60}
            required
            placeholder="e.g. Rent, Gas, Wi-Fi"
            defaultValue={values?.name ?? defaults.name}
            className={`${INPUT} ${state.errors?.name ? "input-error" : ""}`}
          />
          <FieldErrors messages={state.errors?.name} />
        </div>
        <div>
          <label className="field-label" htmlFor={`${idPrefix}_split`}>
            Amount
          </label>
          <select
            id={`${idPrefix}_split`}
            name="split"
            value={split}
            onChange={(event) => setSplit(event.target.value as "same" | "individual")}
            className="select select-sm w-full font-semibold"
          >
            <option value="same">Same for everyone</option>
            <option value="individual">Set per member</option>
          </select>
        </div>
      </div>

      {split === "same" ? (
        <div className="max-w-[12rem]">
          <label className="field-label" htmlFor={`${idPrefix}_amount`}>
            Amount per member
          </label>
          <input
            id={`${idPrefix}_amount`}
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={values?.amount ?? defaults.amount}
            className={`${INPUT} ${state.errors?.amount ? "input-error" : ""}`}
          />
          <FieldErrors messages={state.errors?.amount} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-(--radius-box) border border-line bg-base-100 p-3 max-[520px]:grid-cols-1">
          {members.map((member) => {
            const field = `amount_${member.id}`;
            return (
              <div key={member.id} className="flex items-center gap-3">
                <label className="w-28 shrink-0 truncate font-semibold" htmlFor={`${idPrefix}_${field}`}>
                  {member.username}
                </label>
                <div className="flex-1">
                  <input
                    id={`${idPrefix}_${field}`}
                    name={field}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={values?.[field] ?? defaults.amounts[member.id] ?? ""}
                    className={`${INPUT} ${state.errors?.[field] ? "input-error" : ""}`}
                  />
                  <FieldErrors messages={state.errors?.[field]} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Leader only: "add a utility" — clears itself after a successful save. */
export function AddUtilityForm({
  groupId,
  month,
  members,
}: {
  groupId: number;
  month: YearMonth;
  members: UtilityMember[];
}) {
  const [state, formAction] = useActionState(
    createUtilityType.bind(null, groupId, month),
    emptyFormState,
  );
  // Remount the fields after each successful save so their defaultValues
  // start blank again (state-from-props pattern, no effect needed).
  const [generation, setGeneration] = useState(0);
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.success) setGeneration(generation + 1);
  }

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <UtilityFields
        key={generation}
        idPrefix="id_new_utility"
        members={members}
        state={state.success ? emptyFormState : state}
        defaults={EMPTY_DEFAULTS}
      />
      <SubmitButton className="btn btn-primary btn-sm mt-3" pendingLabel="Adding…">
        Add utility
      </SubmitButton>
    </form>
  );
}

/**
 * Leader only: rename the utility and set this month's bill (split + amounts)
 * inline, plus a confirmed remove.
 */
export function UtilityTypeEditor({
  groupId,
  utilityTypeId,
  month,
  members,
  defaults,
}: {
  groupId: number;
  utilityTypeId: number;
  month: YearMonth;
  members: UtilityMember[];
  defaults: UtilityDefaults;
}) {
  const [state, formAction] = useActionState(
    updateUtilityBill.bind(null, groupId, utilityTypeId, month),
    emptyFormState,
  );
  // "Saved ✓" until the leader edits the row again; a new submit result
  // resets the flag (state-from-props pattern, no effect needed).
  const [dirty, setDirty] = useState(false);
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    setDirty(false);
  }
  const saved = Boolean(state.success) && !dirty;

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} onChange={() => setDirty(true)}>
        <NonFieldErrors state={state} />
        {defaults.prefilledFrom && !state.success ? (
          <p className="alert alert-warning alert-soft mb-3 py-2 text-[0.8rem]">
            Not set for this month yet — prefilled from {defaults.prefilledFrom}. Save to confirm
            or change the amount.
          </p>
        ) : null}
        <UtilityFields
          idPrefix={`id_utility_${utilityTypeId}`}
          members={members}
          state={state}
          defaults={defaults}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SubmitButton className="btn btn-secondary btn-sm" pendingLabel="Saving…">
            {saved ? "Saved ✓" : defaults.prefilledFrom ? "Save for this month" : "Save changes"}
          </SubmitButton>
        </div>
      </form>
      <ConfirmForm
        action={removeUtilityType.bind(null, groupId, utilityTypeId)}
        title="Remove utility?"
        confirmLabel="Remove"
        className="self-start"
        message={() => (
          <>
            Remove <strong>{defaults.name}</strong>? It disappears from this month onward; earlier
            months keep their payment records.
          </>
        )}
      >
        <button type="submit" className="btn btn-ghost btn-xs font-semibold text-bad hover:text-bad-dark">
          Remove this utility
        </button>
      </ConfirmForm>
    </div>
  );
}

/** Leader only: fill every unset bill this month from its latest earlier month. */
export function CopyFromPreviousMonthButton({
  groupId,
  month,
  unsetCount,
}: {
  groupId: number;
  month: YearMonth;
  unsetCount: number;
}) {
  return (
    <form action={copyBillsFromPreviousMonth.bind(null, groupId)}>
      <input type="hidden" name="year" value={month.year} />
      <input type="hidden" name="month" value={month.month} />
      <SubmitButton className="btn btn-warning btn-sm" pendingLabel="Copying…">
        Copy last month&apos;s amounts ({unsetCount} unset)
      </SubmitButton>
    </form>
  );
}

/**
 * One cell of the payment grid. Saves as soon as it's ticked — there's
 * nothing else on the row to submit with it — and shows the new state
 * immediately while the server catches up.
 */
export function PaidToggle({
  groupId,
  utilityTypeId,
  userId,
  year,
  month,
  paid,
  canEdit,
  label,
}: {
  groupId: number;
  utilityTypeId: number;
  userId: number;
  year: number;
  month: number;
  paid: boolean;
  canEdit: boolean;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(paid);

  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={optimisticPaid}
      disabled={!canEdit || isPending}
      onChange={(event) => {
        const next = event.target.checked;
        startTransition(async () => {
          setOptimisticPaid(next);
          await setUtilityPaid({ groupId, utilityTypeId, userId, year, month, paid: next });
        });
      }}
      className={`checkbox checkbox-sm ${optimisticPaid ? "checkbox-success" : "checkbox-error"} disabled:opacity-60`}
    />
  );
}
