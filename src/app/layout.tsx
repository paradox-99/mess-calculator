import type { Metadata } from "next";
import { Nunito } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Self-hosted at build time, so there is no render-blocking request to Google
// and no swap flash. `variable` feeds --font-sans in globals.css.
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: {
    default: "Mess Calculator",
    template: "%s — Mess Calculator",
  },
  description: "Shared meal and expense tracker for small groups.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="mess" className={nunito.variable}>
      {/* Browser extensions inject attributes here (e.g. cz-shortcut-listen)
          before React hydrates; ignore that one-level attribute diff. */}
      <body suppressHydrationWarning>
        <SiteHeader />
        <main className="mx-auto my-8 w-full max-w-[1180px] px-6 max-[680px]:my-5 max-[680px]:px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
