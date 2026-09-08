"use client";

import { useActionState } from "react";

import { login } from "@/app/actions/auth";
import { NonFieldErrors, TextField } from "@/components/form-fields";
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
      <TextField
        name="password"
        label="Password"
        type="password"
        state={state}
        autoComplete="current-password"
        required
      />
      <SubmitButton
        className="btn mt-1 w-full rounded-md bg-rust py-3 font-bold transition hover:-translate-y-px hover:bg-rust-dark"
        pendingLabel="Logging in…"
      >
        Log in
      </SubmitButton>
    </form>
  );
}
