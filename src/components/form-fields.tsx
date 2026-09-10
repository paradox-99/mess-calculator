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
  const messages = state.errors?.__all__;
  if (!messages || messages.length === 0) return null;
  return (
    <div role="alert" className="alert alert-error alert-soft mb-4 text-sm">
      <span aria-hidden="true" className="font-black">
        !
      </span>
      <div>
        {messages.map((message) => (
          <p key={message} className="m-0">
            {message}
          </p>
        ))}
      </div>
    </div>
  );
}

/** The lunch/dinner "did you eat this" checkbox, styled as a filled tile. */
export function MealCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  const id = `id_${name}`;
  return (
    <label
      htmlFor={id}
      className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-(--radius-field) border border-base-300 bg-base-200 px-4 py-3 transition-[border-color,background] duration-150 has-[input:checked]:border-success has-[input:checked]:bg-good-wash has-[input:checked]:text-good-deep max-[520px]:min-h-[2.5rem] max-[520px]:gap-2 max-[520px]:px-3 max-[520px]:py-1.5"
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="checkbox checkbox-success checkbox-sm max-[520px]:checkbox-xs"
      />
      <span className="font-medium max-[520px]:text-[0.85rem]">{label}</span>
    </label>
  );
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
  /** Rendered inside the input's right edge, e.g. a show/hide toggle. */
  trailing?: React.ReactNode;
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
  trailing,
}: TextFieldProps) {
  const id = `id_${name}`;
  const invalid = (state.errors?.[name]?.length ?? 0) > 0;
  return (
    <div className={`mb-4 ${className}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className={`input w-full ${invalid ? "input-error" : ""} ${trailing ? "pr-11" : ""}`}
          id={id}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          defaultValue={state.values?.[name] ?? defaultValue}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
        ) : null}
      </div>
      {help ? <span className="muted mt-1.5 block leading-snug">{help}</span> : null}
      <FieldErrors messages={state.errors?.[name]} />
    </div>
  );
}
