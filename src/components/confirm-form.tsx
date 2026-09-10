"use client";

import { useEffect, useRef, useState } from "react";

type ConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  /** Confirmation copy. Given the form element so it can name the selection. */
  message: (form: HTMLFormElement) => React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "warning";
  className?: string;
  children: React.ReactNode;
};

/**
 * Wraps a form so submitting it opens a confirmation dialog first — the
 * pattern the Django templates hand-rolled for "Remove member", "Close month",
 * and "Transfer leadership".
 */
export function ConfirmForm({
  action,
  title,
  message,
  confirmLabel,
  tone = "danger",
  className,
  children,
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const [detail, setDetail] = useState<React.ReactNode>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const iconClasses =
    tone === "danger" ? "bg-bad-wash text-bad" : "bg-[#fff6dc] text-gold-deep";
  const cardBorder = tone === "danger" ? "border-bad-edge" : "border-sand";
  const confirmClasses = tone === "danger" ? "btn btn-error" : "btn btn-warning";

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={(event) => {
          if (confirmed.current) return;
          event.preventDefault();
          setDetail(message(event.currentTarget));
          setOpen(true);
        }}
      >
        {children}
      </form>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="modal modal-open fixed inset-0 z-20 grid place-items-center bg-[rgba(23,43,58,0.48)] p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className={`modal-box w-[min(100%,420px)] max-w-none border ${cardBorder} bg-base-100 p-7 shadow-[0_24px_60px_rgba(23,43,58,0.24)]`}
          >
            <div
              aria-hidden="true"
              className={`mb-4 grid h-[2.6rem] w-[2.6rem] place-items-center rounded-full text-[1.35rem] font-extrabold ${iconClasses}`}
            >
              !
            </div>
            <h2 className="mb-1.5 text-[1.35rem] font-bold text-navy">{title}</h2>
            <p className="m-0 text-muted">{detail}</p>
            <div className="modal-action mt-6 flex justify-end gap-2.5">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost text-good-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmed.current = true;
                  setOpen(false);
                  formRef.current?.requestSubmit();
                }}
                className={confirmClasses}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
