@AGENTS.md

# Mess Calculator — project guide

Shared meal/expense tracker for small groups (a "mess"). Members log the meals
they ate and the money they spent each day; the app divides the month's total
cost by the month's total meals to get a **meal rate**, then shows each member
what they owe or are owed.

This is a **port of a Django project**, which still lives at
`../mill_calculator` and is the reference for intended behaviour. If something
here looks arbitrary, check the Django original before "fixing" it — the
permission quirks and page layouts are deliberate.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # prisma generate + next build
npm start            # serve the production build (needs AUTH_TRUST_HOST=true)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:migrate   # create + apply a migration (dev only)
npm run db:deploy    # apply migrations (production)
npm run db:seed      # sample data; idempotent
npm run db:studio    # browse the database
```

Seeded logins: `nayeem` (leader), `jhon`, `rafi` — all with password
`messpass123`, in a group whose invite code is `seedmess`.

Run `npm run typecheck && npm run lint && npm run build` before calling work
done. The build runs TypeScript again, so a green build is the real gate.

## Architecture

```
src/
  app/actions/       Server Actions — every mutation lives here
  app/**/page.tsx    Server Components; one folder per route
  app/**/*-form.tsx  Client Components ("use client") for forms with useActionState
  components/        Shared UI
  lib/
    mess-service.ts  The ONLY module that may write DailyEntry
    permissions.ts   Pure predicates — no routing imports
    guards.ts        Predicates → 403/404 for routes
    date.ts          Timezone-aware today() and month helpers
    validation.ts    Zod schemas + Django-equivalent password rules
    session.ts       currentUser() / requireUser()
    form.ts          The FormState shape every form action returns
  auth.ts            Auth.js instance (Credentials provider, Prisma, bcrypt)
  auth.config.ts     Edge-safe half — no DB imports, shared with proxy.ts
  proxy.ts           Route protection (Next 16's replacement for middleware.ts)
  generated/prisma/  Prisma Client output — generated, gitignored, never edit
```

## Hard rules

These encode invariants the Django version enforced. Breaking one causes quiet
data corruption, not a crash.

1. **All `DailyEntry` writes go through `lib/mess-service.ts`.** Never call
   `prisma.dailyEntry.create()/update()/delete()` from a page, action, or
   component. The service is what enforces the leader/member permission rule,
   appends the audit log, and recalculates the cached month totals — Django got
   the last one from a `post_save` signal that has no equivalent here.
2. **`ActivityLog` is append-only.** Never update or delete those rows.
3. **Non-members get 404, not 403,** for a group's pages. A group's existence
   is not revealed to outsiders. `requireMemberGroup()` already does this.
4. **`lib/permissions.ts` must not import `next/navigation`,** or the service
   layer drags routing into its dependency graph and stops being testable
   outside a request. Guards that need `forbidden()`/`notFound()` go in
   `lib/guards.ts`.
5. **Calendar dates are UTC midnight.** Build them with `utcDate()` from
   `lib/date.ts` and store in `@db.Date` columns. Never `new Date(string)` for
   a calendar date — it drifts across timezones. "Today" comes from `today()`,
   which resolves in `APP_TIME_ZONE`, not the server's clock.
6. **Money and meals are `Prisma.Decimal`, never `number`.** Use `.plus()`,
   `.minus()`, `.times()`, `.equals()`. Formatting helpers are in `lib/format.ts`.
   Don't pass a Decimal to a Client Component — format it to a string first.

## Conventions

- **Server Components by default.** A component becomes a Client Component only
  when it needs `useActionState`, `useFormStatus`, or event handlers. Forms
  follow the pattern: `page.tsx` (server, loads data + guards) renders
  `*-form.tsx` (client, `useActionState` over an action from `app/actions/`).
- **Form errors** use the `FormState` shape in `lib/form.ts`:
  `errors.__all__` for non-field errors, `errors.<field>` for field errors, and
  `values` to repopulate inputs. This mirrors a bound Django form.
- **Actions with route params** are bound: `saveDailyEntry.bind(null, groupId, userId)`.
- **Styling is Tailwind utilities** against the theme tokens in
  `app/globals.css` (`brand`, `flame`, `gold`, `sea`, `ink`, `muted`, `line`, …).
  Use the tokens, not raw hex, and keep the `max-[680px]:` responsive breakpoint
  the ported layouts already use.
- **Validation is Zod**, in `lib/validation.ts`. Parse in the action, never
  trust the client.

## Gotchas that already bit us

- **Pin Prisma.** `prisma@latest` currently resolves to an `8.0.0` release
  candidate with a completely different CLI (no `generate`/`migrate`). Stay on
  the `7.x` line and keep `prisma` and `@prisma/client` on the same version.
- **Migrations hang on Supabase's transaction pooler (port 6543).** Set
  `DIRECT_URL` to the session-mode connection (same host, port 5432);
  `prisma.config.ts` prefers it for the CLI while the app stays on
  `DATABASE_URL`.
- **Prisma 7 uses a driver adapter.** The connection URL lives in
  `prisma.config.ts` (not `schema.prisma`), and the client is constructed with
  `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
  `prisma.config.ts` reads `process.env.DATABASE_URL` directly rather than
  Prisma's `env()` helper, because `env()` throws when unset and
  `prisma generate` runs on `npm install`, before anyone has made a `.env`.
- **Import Prisma types from `@/generated/prisma/client`,** not
  `@prisma/client`.
- **`proxy.ts`, not `middleware.ts`.** Next 16 renamed it and rejects a
  destructured export — it needs a real exported function. The unused typed
  `_event` parameter in `proxy.ts` is what selects Auth.js's middleware
  overload; don't delete it.
- **`AUTH_TRUST_HOST=true` is mandatory** outside Vercel. Without it every
  request fails with `UntrustedHost`, including under `npm start` locally. Dev
  mode hides this.
- **`forbidden()` needs `experimental.authInterrupts`** in `next.config.ts`,
  paired with `app/forbidden.tsx`.
- **Keep the seed idempotent.** It upserts on the fixed invite code
  `seedmess`; an earlier version created a random code each run and silently
  produced duplicate groups, which breaks the one-group-per-user assumption.

## Domain rules

- A user belongs to **at most one active group**. `/groups` redirects straight
  to that group's dashboard.
- Each group has exactly one **leader**; everyone else is a **member**.
  Transferring leadership demotes the outgoing leader in the same transaction.
- A leader may edit anyone's entries; a member may edit only their own.
- Only the leader sees the audit log, adds/removes members, adds extra meals,
  and closes a month.
- A month can only be closed **after it has ended**. A closed month rejects all
  entry writes.
- `MonthCycle` rows are created on demand — pages call `getOrCreateMonthCycle()`
  rather than assuming one exists.
- Removing a member deactivates the membership (`isActive: false`, `leftAt`)
  rather than deleting it, so their historical entries survive.
- **Maid absence** (`MaidAbsence`, one row per group-date with lunch/dinner
  flags) is group-wide: any member may mark it from the entry forms. Marking a
  sitting absent clears that meal on every member's entry for the date (audited
  under the marker) and `recordDailyEntry()` rejects logging it afterwards.
  Unmarking restores nothing.
- **Utilities** (`UtilityType` + `UtilityBill` + `UtilityBillShare` +
  `UtilityPayment`): the leader defines the group's utility *types* (name
  only; removal deactivates). **Amounts are per month** — gas and electricity
  change — in a `UtilityBill` per type × month cycle, either `sameForAll`
  (one `amount`, covers members who join later) or per member
  (`UtilityBillShare` rows). No bill for a month = "not set"; the leader's
  editor prefills from the latest earlier month and `copyBillsFromPreviousMonth`
  fills all unset ones at once. `amountFor()` in `lib/utility-service.ts`
  resolves a member's figure. Payments are per month cycle — members tick
  their own, the leader can tick anyone's (same rule as `canEditEntry`). The
  dashboard's Utilities column is green only when every active type is paid
  for that month. Not blocked by a closed month, since bills are often paid
  late.

## Not built yet

The Django project had an empty `notifications` app intended for a monthly
summary email to the group once the leader closes a month. Closing works; the
email does not exist here.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
