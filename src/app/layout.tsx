import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mess Calculator",
    template: "%s — Mess Calculator",
  },
  description: "Shared meal and expense tracker for small groups.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="mx-auto my-8 w-full max-w-[1180px] px-6 max-[680px]:my-5 max-[680px]:px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
