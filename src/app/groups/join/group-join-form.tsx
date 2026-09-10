"use client";

import { useActionState } from "react";

import { joinGroup } from "@/app/actions/groups";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function GroupJoinForm() {
  const [state, formAction] = useActionState(joinGroup, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField name="inviteCode" label="Invite code" state={state} maxLength={12} required />
      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Joining…">
        Join
      </SubmitButton>
    </form>
  );
}
