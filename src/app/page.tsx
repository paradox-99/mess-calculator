import Link from "next/link";
import type { Metadata } from "next";

import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mess Calculator — Shared meals, settled simply",
};

const FEATURES = [
  {
    number: "01 / TRACK",
    title: "Meals made visible",
    body: "Mark lunch and dinner as they happen and keep the month’s meal count honest.",
    accent: "border-t-flame",
    numberColor: "text-flame",
  },
  {
    number: "02 / SHARE",
    title: "One shared record",
    body: "Keep group members, costs, and entries together instead of scattered across chats.",
    accent: "border-t-sea",
    numberColor: "text-sea",
  },
  {
    number: "03 / SETTLE",
    title: "Balances without guesswork",
    body: "See who owes and who gets money back with a simple monthly balance.",
    accent: "border-t-gold",
    numberColor: "text-[#bd8a0c]",
  },
];

const SAMPLE_ROWS = [
  { name: "Nayeem", meals: "24 meals", amount: "৳ 840" },
  { name: "Jhon", meals: "21 meals", amount: "৳ 735" },
  { name: "Rafi", meals: "18 meals", amount: "৳ 630" },
];

export default async function HomePage() {
  const user = await currentUser();

  return (
    <div className="mx-auto mb-16 mt-4 max-w-[1120px] text-navy max-[760px]:mt-0">
      <section className="relative grid min-h-[470px] items-center gap-12 overflow-hidden rounded-[18px] bg-brand p-[clamp(2rem,6vw,5rem)] [grid-template-columns:minmax(0,1.05fr)_minmax(300px,0.95fr)] before:pointer-events-none before:absolute before:-top-32 before:right-[24%] before:h-72 before:w-72 before:rounded-full before:bg-gold before:opacity-95 before:content-[''] after:pointer-events-none after:absolute after:-bottom-32 after:-right-20 after:h-96 after:w-96 after:rounded-full after:bg-flame after:content-[''] max-[760px]:min-h-0 max-[760px]:grid-cols-1 max-[760px]:gap-8 max-[760px]:px-6 max-[760px]:pb-10 max-[760px]:pt-8">
        <div className="relative z-[1]">
          <p className="mb-5 text-[0.78rem] font-extrabold uppercase tracking-[0.16em] text-gold">
            Shared meals, settled simply
          </p>
          <h1 className="m-0 max-w-[600px] font-serif text-[clamp(2.8rem,7vw,5.7rem)] font-normal leading-[0.98] text-cream">
            Less counting. More eating.
          </h1>
          <p className="mb-8 mt-6 max-w-[510px] text-[1.08rem] text-brand-mist">
            Mess Calculator keeps your group meals, costs, and balances clear, so everyone knows
            where they stand.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                href="/groups"
                className="btn btn-lg border-0 bg-flame font-extrabold text-white hover:bg-flame-dark"
              >
                Open your mess
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="btn btn-lg border-0 bg-flame font-extrabold text-white hover:bg-flame-dark"
                >
                  Start a mess
                </Link>
                <Link
                  href="/login"
                  className="btn btn-lg btn-outline border-brand-edge font-extrabold text-brand-tint hover:border-white hover:bg-white/10 hover:text-white"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        <div
          aria-label="Example monthly meal summary"
          className="card relative z-[1] border border-white/45 bg-[rgba(255,253,247,0.94)] p-5 shadow-[0_22px_40px_rgba(9,42,52,0.24)] [transform:rotate(2deg)] max-[760px]:[transform:none]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#d8e2df] pb-3.5 max-[760px]:flex-col max-[760px]:items-start">
            <strong className="text-navy">Flat 6B</strong>
            <span className="text-[0.8rem] font-extrabold text-flame">SEPTEMBER 2026</span>
          </div>
          {SAMPLE_ROWS.map((row) => (
            <div
              key={row.name}
              className="grid gap-2 border-b border-[#e8eeeb] py-4 text-[0.9rem] text-slate-blue [grid-template-columns:1.2fr_0.8fr_0.8fr] max-[760px]:grid-cols-2 max-[760px]:[&>span:last-child]:text-right"
            >
              <strong className="text-navy">{row.name}</strong>
              <span>{row.meals}</span>
              <span>{row.amount}</span>
            </div>
          ))}
          <div className="mt-4 flex justify-between rounded-md bg-gold p-3 font-extrabold text-navy">
            <span>Meal rate</span>
            <span>৳ 35.00</span>
          </div>
        </div>
      </section>

      <section className="pb-4 pt-[4.5rem] max-[760px]:pt-14">
        <div className="mb-8 max-w-[560px]">
          <h2 className="mb-2.5 font-serif text-[clamp(2rem,4vw,3rem)] font-normal text-navy">
            A calmer way to run a shared mess.
          </h2>
          <p className="m-0 text-slate-blue">
            Record the everyday details once, then let everyone see the useful picture at a glance.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className={`card min-h-[180px] border-t-[5px] ${feature.accent} bg-base-100 p-6 shadow-[0_8px_24px_rgba(23,43,58,0.07)]`}
            >
              <span className={`text-[0.8rem] font-extrabold tracking-[0.1em] ${feature.numberColor}`}>
                {feature.number}
              </span>
              <h3 className="mb-2 mt-3.5 text-[1.15rem]">{feature.title}</h3>
              <p className="m-0 text-[0.92rem] text-slate-blue">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-16 flex items-center justify-between gap-4 rounded-lg bg-navy px-6 py-5 text-brand-mist max-[760px]:flex-col max-[760px]:items-start">
        <p className="m-0">Ready to make your next month easier?</p>
        <Link href={user ? "/groups" : "/signup"} className="link link-hover font-extrabold text-gold">
          {user ? "Go to your groups →" : "Create your account →"}
        </Link>
      </div>
    </div>
  );
}
