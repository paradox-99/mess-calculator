import type { FormState } from "@/lib/form";

export function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <ul className="errorlist">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

/** Django's `{{ form.non_field_errors }}`. */
export function NonFieldErrors({ state }: { state: FormState }) {
  return <FieldErrors messages={state.errors?.__all__} />;
}

type TextFieldProps = {
  name: string;
  label: string;
  state: FormState;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  help?: string;
  className?: string;
};

export function TextField({
  name,
  label,
  state,
  type = "text",
  defaultValue = "",
  required,
  autoComplete,
  maxLength,
  help,
  className = "",
}: TextFieldProps) {
  const id = `id_${name}`;
  return (
    <p className={`mb-4 ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="field-input"
        id={id}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        defaultValue={state.values?.[name] ?? defaultValue}
      />
      {help ? <span className="muted mt-1.5 block leading-snug">{help}</span> : null}
      <FieldErrors messages={state.errors?.[name]} />
    </p>
  );
}
