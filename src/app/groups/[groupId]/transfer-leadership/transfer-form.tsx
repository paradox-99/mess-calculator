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
      <div role="alert" className="alert alert-warning alert-soft mt-6">
        <span>There is no one to transfer leadership to yet — add another member first.</span>
      </div>
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
        <div className="mb-4 mt-4">
          <label className="field-label" htmlFor="id_memberId">
            New leader
          </label>
          <select
            id="id_memberId"
            name="memberId"
            required
            defaultValue={state.values?.memberId ?? ""}
            className={`select w-full ${state.errors?.memberId ? "select-error" : ""}`}
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
        </div>
        <button type="submit" className="btn btn-error btn-lg btn-block mt-2">
          Transfer leadership
        </button>
      </ConfirmForm>
    </>
  );
}
