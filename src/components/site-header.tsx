import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { currentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await currentUser();

  return (
    <header className="navbar sticky top-0 z-[2] gap-4 border-b border-[#d8e2df] bg-[rgba(255,253,247,0.92)] px-[clamp(1rem,4vw,3rem)] py-3 shadow-[0_4px_18px_rgba(23,43,58,0.06)] backdrop-blur max-[680px]:gap-2 max-[680px]:px-4">
      <div className="navbar-start w-auto flex-1">
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
      </div>

      <nav className="navbar-end w-auto flex-none items-center gap-2 max-[680px]:gap-1">
        {user ? (
          <>
            <Link href="/groups" className="btn btn-sm btn-primary max-[680px]:hidden">
              My mess
            </Link>
            <Link
              href="/profile"
              className="btn btn-sm btn-warning max-w-40 rounded-full max-[680px]:hidden"
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {user.username}
              </span>
            </Link>
            <form action={logout} className="max-[680px]:hidden">
              <button type="submit" className="btn btn-sm bg-flame text-white hover:bg-flame-dark">
                Log out
              </button>
            </form>

            {/* Mobile: the same links behind a <details> disclosure, no JS. */}
            <details className="dropdown dropdown-end hidden max-[680px]:block">
              <summary
                aria-label="Open menu"
                title="Open menu"
                className="btn btn-ghost btn-sm grid h-[2.35rem] w-[2.7rem] content-center justify-items-center gap-[0.28rem] px-0 [&::-webkit-details-marker]:hidden"
                style={{ listStyle: "none" }}
              >
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
                <span className="block h-[0.14rem] w-[1.35rem] rounded-full bg-ink" />
              </summary>
              <ul className="menu dropdown-content z-[5] mt-2 min-w-48 gap-1 rounded-box border border-line bg-white p-2 shadow-[0_12px_28px_rgba(23,43,58,0.16)]">
                <li className="menu-title border-b border-[#e8eeeb] pb-2 text-good-ink">
                  <Link href="/profile" className="px-3 font-bold text-good-ink">
                    {user.username} — Profile
                  </Link>
                </li>
                <li>
                  <Link href="/groups" className="font-semibold">
                    My mess
                  </Link>
                </li>
                <li>
                  <form action={logout}>
                    <button type="submit" className="w-full text-left font-semibold">
                      Log out
                    </button>
                  </form>
                </li>
              </ul>
            </details>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-sm btn-primary">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-sm bg-flame text-white hover:bg-flame-dark">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
