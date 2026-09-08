import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { LoginForm } from "./login-form";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/groups");

  return (
    <section className="mx-auto max-w-[520px] px-4 py-12 max-[680px]:flex max-[680px]:min-h-[calc(100vh-7rem)] max-[680px]:items-center max-[680px]:py-0">
      <div className="w-full rounded-xl border border-line bg-white shadow-[0_18px_45px_rgba(31,35,40,0.08)]">
        <div className="px-[clamp(1.5rem,5vw,4rem)] py-10 max-[680px]:p-6 max-[680px]:text-[0.9rem]">
          <h1 className="mb-1.5 text-2xl max-[680px]:text-[1.35rem]">Log in</h1>
          <span className="muted mb-7 block max-[680px]:mb-5 max-[680px]:text-[0.82rem]">
            Welcome back to Mess Calculator.
          </span>
          <LoginForm />
          <p className="muted mt-6 text-center max-[680px]:text-[0.82rem]">
            New here?{" "}
            <Link href="/signup" className="font-bold text-good">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
