"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that disables itself while its form's action is in flight —
 * the double-submit guard the Django POST/redirect flow got for free.
 */
export function SubmitButton({
  children,
  className = "",
  pendingLabel,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
