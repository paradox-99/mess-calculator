"use client";

import { useActionState } from "react";

import { login } from "@/app/actions/auth";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function LoginForm() {
  const [state, formAction] = useActionState(login, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField
        name="username"
        label="Username"
        state={state}
        autoComplete="username"
        required
      />
      <PasswordField
        name="password"
        label="Password"
        state={state}
        autoComplete="current-password"
        required
      />
      <SubmitButton
        className="btn btn-accent btn-lg btn-block mt-1"
        pendingLabel="Logging in…"
      >
        Log in
      </SubmitButton>
    </form>
  );
}
