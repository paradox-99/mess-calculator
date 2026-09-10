import type { DetailedHTMLProps, HTMLAttributes } from "react";

// Cally ships an HTMLElementTagNameMap but no JSX declarations, so TSX needs
// these to accept the custom elements.
type CustomElement<Extra = Record<string, never>> = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  Extra;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** https://wicky.nillia.ms/cally/ — `value` is `YYYY-MM-DD`. */
      "calendar-date": CustomElement<{ value?: string; min?: string; max?: string }>;
      /** Multi-select variant — `value` is a space-separated list of `YYYY-MM-DD`. */
      "calendar-multi": CustomElement<{ value?: string; min?: string; max?: string }>;
      "calendar-month": CustomElement;
    }
  }
}
