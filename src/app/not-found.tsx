import type { Metadata } from "next";

import { ErrorPage } from "@/components/error-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      codeClassName="text-flame"
      title="We couldn't find that page."
      message="The page may have moved or the address may be incorrect."
    />
  );
}
