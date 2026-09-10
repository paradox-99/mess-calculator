import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SignupForm } from "./signup-form";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await currentUser()) redirect("/groups");

  return (
    <section className="mx-auto max-w-[680px] px-4 py-12 max-[680px]:py-5">
      <div className="card border border-line border-t-4 border-t-flame bg-base-100 shadow-[0_18px_45px_rgba(31,35,40,0.08)]">
        <div className="card-body px-[clamp(1.25rem,4vw,2.5rem)] py-10 max-[680px]:px-5 max-[680px]:py-7">
          <h1 className="card-title mb-1.5 text-2xl tracking-[-0.02em]">Create your account</h1>
          <p className="muted mb-7">Start managing your mess in a few seconds.</p>
          <SignupForm />
        </div>
      </div>

      <p className="muted mt-5 text-center">
        Already have an account?{" "}
        <Link href="/login" className="link link-hover font-bold text-good">
          Log in
        </Link>
      </p>
    </section>
  );
}
