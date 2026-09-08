import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { currentUser } from "@/lib/session";

const navLink =
  "rounded-[5px] border border-transparent px-2.5 py-1.5 text-[0.92rem] font-semibold no-underline";

export async function SiteHeader() {
  const user = await currentUser();

  return (
    <header className="relative z-[2] flex items-center justify-between gap-6 border-b border-[#d8e2df] bg-[rgba(255,253,247,0.96)] px-[clamp(1rem,4vw,3rem)] py-3.5 shadow-[0_4px_18px_rgba(23,43,58,0.06)] max-[680px]:gap-2 max-[680px]:px-4 max-[680px]:py-3">
      <Link
        href="/"
        aria-label="Mess Calculator home"
        className="inline-flex items-center gap-2.5 text-navy no-underline max-[680px]:gap-2"
      >
        <span
          aria-hidden="true"
          className="grid h-[2.35rem] w-[2.35rem] place-items-center rounded-[8px_8px_11px_11px] bg-brand text-[0.78rem] font-black tracking-[-0.08em] text-gold shadow-[inset_0_-5px_0_#e76f51]"
        >
          MC
        </span>
        <span className="font-serif text-[1.15rem] font-bold max-[680px]:text-base max-[680px]:leading-tight">
          Mess Calculator
        </span>
      </Link>

      <nav className="flex items-center gap-1.5 max-[680px]:flex-wrap max-[680px]:justify-end max-[680px]:gap-1">
        {user ? (
          <>
            <Link
              href="/groups"
              className={`${navLink} bg-brand text-white hover:bg-brand-dark max-[680px]:hidden`}
            >
              My mess
            </Link>
            <Link
              href="/profile"
              className={`${navLink} max-w-40 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-gold text-navy hover:bg-gold-dark max-[680px]:hidden`}
            >
              {user.username}
            </Link>
            <form action={logout} className="max-[680px]:hidden">
              <button
                type="submit"
                className={`${navLink} cursor-pointer bg-flame text-white hover:bg-flame-dark`}
              >
                Log out
              </button>
            </form>

            {/* Mobile: the same links behind a <details> disclosure, no JS. */}
            <details className="relative hidden max-[680px]:block">
              <summary
                aria-label="Open menu"
                title="Open menu"
                className="grid h-[2.35rem] w-[2.7rem] cursor-pointer content-center justify-items-center gap-[0.28rem] rounded-full p-1.5 [&::-webkit-details-marker]:hidden"
                style={{ listStyle: "none" }}
              >
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[5] grid min-w-48 gap-1 rounded-lg border border-line bg-white p-2 shadow-[0_12px_28px_rgba(23,43,58,0.16)]">
                <Link
                  href="/profile"
                  className="border-b border-[#e8eeeb] px-3 py-2 text-[0.85rem] font-bold text-good-ink no-underline"
                >
                  {user.username} — Profile
                </Link>
                <Link
                  href="/groups"
                  className="rounded-[5px] px-3 py-2.5 text-left text-[0.9rem] font-semibold text-ink no-underline hover:bg-brand-tint hover:text-brand"
                >
                  My mess
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-[5px] border-0 bg-transparent px-3 py-2.5 text-left text-[0.9rem] font-semibold text-ink hover:bg-brand-tint hover:text-brand"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </details>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={`${navLink} bg-brand font-extrabold text-white hover:bg-brand-dark`}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className={`${navLink} bg-flame font-extrabold text-white hover:bg-flame-dark`}
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
