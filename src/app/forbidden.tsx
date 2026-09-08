import { ErrorPage } from "@/components/error-page";

/** Rendered wherever the app calls `forbidden()` — Django's handler403. */
export default function Forbidden() {
  return (
    <ErrorPage
      code="403"
      codeClassName="text-gold"
      title="You don't have access to this page."
      message="Ask the group leader for access or return to your dashboard."
    />
  );
}
