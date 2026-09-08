/**
 * The shape every form action returns, standing in for a bound Django form:
 * `errors.__all__` holds non-field errors, any other key holds that field's
 * messages, and `values` re-populates the inputs after a failed submit.
 */
export type FormState = {
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
  success?: boolean;
};

export const emptyFormState: FormState = {};

export function nonFieldError(message: string, values?: Record<string, string>): FormState {
  return { errors: { __all__: [message] }, values };
}

/** Reads a form field as a trimmed string. */
export function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Reads a form field without trimming — passwords may legitimately have spaces. */
export function raw(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
