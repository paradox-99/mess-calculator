"use client";

import { useActionState } from "react";

import { addMember } from "@/app/actions/groups";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function AddMemberForm({ groupId }: { groupId: number }) {
  const [state, formAction] = useActionState(addMember.bind(null, groupId), emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField name="username" label="Username" state={state} maxLength={150} required />
      <SubmitButton
        className="btn btn-primary btn-lg btn-block mt-2"
        pendingLabel="Adding…"
      >
        Add member
      </SubmitButton>
    </form>
  );
}
