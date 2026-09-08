"use client";

import { useActionState } from "react";

import { changePassword, updateProfile } from "@/app/actions/auth";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

const cardButton =
  "btn mt-1 w-full rounded-md bg-brand py-2.5 font-bold hover:bg-brand-dark";

export function ProfileDetailsForm({
  defaults,
}: {
  defaults: { username: string; firstName: string; lastName: string; email: string };
}) {
  const [state, formAction] = useActionState(updateProfile, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField
        name="username"
        label="Username"
        state={state}
        defaultValue={defaults.username}
        maxLength={150}
        required
      />
      <TextField
        name="firstName"
        label="First name"
        state={state}
        defaultValue={defaults.firstName}
      />
      <TextField name="lastName" label="Last name" state={state} defaultValue={defaults.lastName} />
      <TextField
        name="email"
        label="Email address"
        type="email"
        state={state}
        defaultValue={defaults.email}
        required
      />
      <SubmitButton className={cardButton} pendingLabel="Saving…">
        Save account details
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField
        name="oldPassword"
        label="Old password"
        type="password"
        state={state}
        autoComplete="current-password"
        required
      />
      <TextField
        name="newPassword1"
        label="New password"
        type="password"
        state={state}
        autoComplete="new-password"
        required
      />
      <TextField
        name="newPassword2"
        label="New password confirmation"
        type="password"
        state={state}
        autoComplete="new-password"
        required
      />
      <SubmitButton className={cardButton} pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}
