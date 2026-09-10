"use client";

import { useActionState } from "react";

import { signup } from "@/app/actions/auth";
import { NonFieldErrors, TextField } from "@/components/form-fields";
import { PasswordField } from "@/components/password-field";
import { SubmitButton } from "@/components/submit-button";
import { emptyFormState } from "@/lib/form";

/** Section heading, in the same key as the table headers elsewhere in the app. */
function GroupLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-3 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-muted ${className}`}
    >
      {children}
    </p>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, emptyFormState);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />

      <GroupLabel>Your details</GroupLabel>
      <TextField
        name="username"
        label="Username"
        state={state}
        maxLength={150}
        autoComplete="username"
        required
        help="Letters, digits and @/./+/-/_ only."
      />
      {/* Both names keep their own mb-4, so the row spaces itself like one field. */}
      <div className="grid grid-cols-2 gap-x-4 max-[520px]:grid-cols-1">
        <TextField name="firstName" label="First name" state={state} autoComplete="given-name" />
        <TextField name="lastName" label="Last name" state={state} autoComplete="family-name" />
      </div>
      <TextField
        name="email"
        label="Email address"
        type="email"
        state={state}
        autoComplete="email"
        required
      />

      <GroupLabel className="mt-6 border-t border-line pt-6">Password</GroupLabel>
      <PasswordField
        name="password1"
        label="Password"
        state={state}
        autoComplete="new-password"
        required
        help="At least 8 characters."
      />
      <PasswordField
        name="password2"
        label="Password confirmation"
        state={state}
        autoComplete="new-password"
        required
      />

      <SubmitButton className="btn btn-accent btn-lg btn-block mt-3" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
