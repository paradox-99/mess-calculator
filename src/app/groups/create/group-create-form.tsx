"use client";

import { useActionState } from "react";

import { createGroup } from "@/app/actions/groups";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function GroupCreateForm() {
  const [state, formAction] = useActionState(createGroup, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField name="name" label="Name" state={state} maxLength={100} required />
      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Creating…">
        Create
      </SubmitButton>
    </form>
  );
}
