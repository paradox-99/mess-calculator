"use client";

import { useActionState } from "react";

import { transferLeadership } from "@/app/actions/groups";
import { ConfirmForm } from "@/components/confirm-form";
import { FieldErrors, NonFieldErrors } from "@/components/form-fields";
import { emptyFormState } from "@/lib/form";

type Member = { id: number; username: string };

export function TransferLeadershipForm({
  groupId,
  members,
}: {
  groupId: number;
  members: Member[];
}) {
  const [state, formAction] = useActionState(
    transferLeadership.bind(null, groupId),
    emptyFormState,
  );

  if (members.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-sand bg-white p-4 text-muted">
        There is no one to transfer leadership to yet — add another member first.
      </p>
    );
  }

  return (
    <>
      <NonFieldErrors state={state} />
      <ConfirmForm
        action={formAction}
        title="Transfer leadership?"
        confirmLabel="Transfer leadership"
        tone="warning"
        message={(form) => {
          const select = form.querySelector<HTMLSelectElement>("select[name='memberId']");
          const name = select?.selectedOptions[0]?.textContent ?? "the selected member";
          return (
            <>
              Transfer leadership to <strong>{name}</strong>? You will become a normal member.
            </>
          );
        }}
      >
        <p className="mb-4 mt-4">
          <label className="field-label" htmlFor="id_memberId">
            New leader
          </label>
          <select
            id="id_memberId"
            name="memberId"
            required
            defaultValue={state.values?.memberId ?? ""}
            className="field-input"
          >
            <option value="" disabled>
              ---------
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.username}
              </option>
            ))}
          </select>
          <FieldErrors messages={state.errors?.memberId} />
        </p>
        <button
          type="submit"
          className="btn mt-2 w-full rounded-md bg-bad py-3 font-bold hover:bg-bad-dark"
        >
          Transfer leadership
        </button>
      </ConfirmForm>
    </>
  );
}
