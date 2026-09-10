"use client";

import { useEffect, useRef, useState } from "react";

import { FieldErrors } from "@/components/form-fields";
import { formatISODateLabel } from "@/lib/date";

/**
 * The date picker used by the entry forms: a daisyUI dropdown holding a Cally
 * `<calendar-date>`, which daisyUI's `.cally` styles theme with the app's own
 * palette. Replaces `<input type="date">`, whose popup is browser chrome and
 * cannot be styled.
 *
 * The value still reaches the server action as `YYYY-MM-DD` through a hidden
 * input, so the Zod schema and the action are unchanged.
 */
export function DateField({
  name,
  label,
  value,
  errors,
  className = "mb-4",
  onValueChange,
}: {
  name: string;
  label: string;
  /** `YYYY-MM-DD`. Re-seeds the picker when the action bounces the form back. */
  value: string;
  errors?: string[];
  className?: string;
  /** Fires with the new `YYYY-MM-DD` whenever the user picks a date. */
  onValueChange?: (value: string) => void;
}) {
  const id = `id_${name}`;
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLElement>(null);

  // Re-seed during render (React's documented way to adjust state on a prop
  // change) if the action hands back a different value than the one on screen.
  const [seeded, setSeeded] = useState(value);
  if (seeded !== value) {
    setSeeded(value);
    setSelected(value);
  }

  // Cally calls customElements.define on import, so it can only load in the
  // browser. Until it does, the closed dropdown renders nothing visible.
  useEffect(() => {
    void import("cally");
  }, []);

  // Cally dispatches a plain `change` event; React does not surface events from
  // custom elements as props, so subscribe to the node directly.
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;
    const onChange = (event: Event) => {
      const next = (event.target as HTMLElement & { value?: string }).value;
      if (!next) return;
      setSelected(next);
      setOpen(false);
      // Without this the dropdown's :focus-within rule keeps it open.
      triggerRef.current?.focus();
      onValueChange?.(next);
    };
    calendar.addEventListener("change", onChange);
    return () => calendar.removeEventListener("change", onChange);
  }, [onValueChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>

      <div ref={rootRef} className={`dropdown w-full ${open ? "dropdown-open" : ""}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className={`input w-full cursor-pointer justify-between text-left font-normal ${
            errors?.length ? "input-error" : ""
          }`}
        >
          <span>{formatISODateLabel(selected)}</span>
          <CalendarIcon />
        </button>

        <div className="dropdown-content mt-1 rounded-box border border-line bg-base-100 p-2 shadow-[0_12px_28px_rgba(23,43,58,0.16)]">
          <calendar-date ref={calendarRef} className="cally" value={selected}>
            <ChevronIcon slot="previous" label="Previous month" direction="left" />
            <ChevronIcon slot="next" label="Next month" direction="right" />
            <calendar-month />
          </calendar-date>
        </div>
      </div>

      {/* What the server action actually reads. */}
      <input type="hidden" name={name} value={selected} />
      <FieldErrors messages={errors} />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 opacity-60"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ChevronIcon({
  slot,
  label,
  direction,
}: {
  slot: string;
  label: string;
  direction: "left" | "right";
}) {
  return (
    <svg
      slot={slot}
      aria-label={label}
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
