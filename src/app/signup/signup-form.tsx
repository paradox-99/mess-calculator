"use client";

import { useActionState } from "react";

import { signup } from "@/app/actions/auth";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

export function SignupForm() {
  const [state, formAction] = useActionState(signup, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />
      <TextField
        name="username"
        label="Username"
        state={state}
        maxLength={150}
        autoComplete="username"
        required
        help="150 characters or fewer. Letters, digits and @/./+/-/_ only."
      />
      <TextField name="firstName" label="First name" state={state} autoComplete="given-name" />
      <TextField name="lastName" label="Last name" state={state} autoComplete="family-name" />
      <TextField
        name="email"
        label="Email address"
        type="email"
        state={state}
        autoComplete="email"
        required
      />
      <TextField
        name="password1"
        label="Password"
        type="password"
        state={state}
        autoComplete="new-password"
        required
        help="At least 8 characters, not entirely numeric, and not too similar to your other details."
      />
      <TextField
        name="password2"
        label="Password confirmation"
        type="password"
        state={state}
        autoComplete="new-password"
        required
        help="Enter the same password again, for verification."
      />
      <SubmitButton
        className="btn mt-1 w-full rounded-md bg-rust py-3 font-bold transition hover:-translate-y-px hover:bg-rust-dark"
        pendingLabel="Creating account…"
      >
        Create account
      </SubmitButton>
    </form>
  );
}
