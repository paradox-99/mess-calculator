import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { SignupForm } from "./signup-form";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await currentUser()) redirect("/groups");

  return (
    <section className="mx-auto max-w-[520px] px-4 py-12 max-[680px]:py-5">
      <div className="rounded-xl border border-line bg-white shadow-[0_18px_45px_rgba(31,35,40,0.08)]">
        <div className="px-[clamp(1.5rem,5vw,4rem)] py-10 max-[680px]:p-7">
          <h2 className="mb-1.5 text-2xl">Create your account</h2>
          <span className="muted mb-7 block">Start managing your mess in a few seconds.</span>
          <SignupForm />
          <p className="muted mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-good">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
