# Mess Calculator

Shared meal/expense tracker for small groups. A Next.js port of the original
Django project (`../mill_calculator`), with the same features, permission
rules, and page-by-page layout.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4
· Prisma 7 + PostgreSQL · Auth.js v5 (credentials + JWT session) · Zod

## What it does

A group of people sharing meals ("a mess") needs to settle up at the end of
each month. Everyone eats a different number of meals and pays for groceries on
different days, so "split it evenly" is wrong. This app does the arithmetic
properly:

```
meal rate = total cost for the month ÷ total meals for the month
amount due = your meals × meal rate
balance    = what you paid − what you owe
```

A positive balance means the group owes you money; negative means you owe the
group. Every member's balance is visible to the whole group, and the balances
always sum to zero.

Each month is its own independent calculation. Once a month has ended, the
leader can **close** it, which freezes every entry in it.

### Features

- **Accounts** — sign up, log in, edit your profile, change your password.
- **Groups** — create a group (you become its leader) or join one with an
  invite code. A leader can also add a member directly by username.
- **Daily entries** — record lunch, dinner, and the money you spent, per day.
  Meals are decimals, so half-meals and guest meals work.
- **Extra meals** — the leader can add an additional meal for someone on a
  given day, on top of their normal entry.
- **Dashboard** — the month's total cost, total meals, and meal rate, plus a
  per-member table of cost paid, meals eaten, amount due, and balance.
- **Daily meal details** — a calendar grid of the whole month showing who ate
  lunch and dinner on each day, plus an extra-meals tally per person.
- **My calculation** — a member's own figures for the month.
- **Month navigation** — move between months, or pick one from a dropdown.
  Every month keeps its own separate calculation.
- **Close month** — the leader freezes a finished month; entries become
  read-only.
- **Audit log** — every change to any entry is recorded (who changed what, for
  whom, on which date, old value → new value). Leader-only, and append-only.
- **Transfer leadership** — the leader promotes a member and becomes an
  ordinary member in the same transaction.

### Roles and permissions

Everyone in a group is either its single **leader** or an ordinary **member**.

| Action                          | Leader | Member          |
| ------------------------------- | :----: | :-------------: |
| View dashboard, details, totals | ✅     | ✅              |
| Edit their own daily entry      | ✅     | ✅              |
| Edit **another** member's entry | ✅     | ❌              |
| View their own calculation      | ✅     | ✅              |
| Add an extra meal for someone   | ✅     | ❌              |
| Add / remove members            | ✅     | ❌              |
| View the activity log           | ✅     | ❌              |
| Close a finished month          | ✅     | ❌              |
| Transfer leadership             | ✅     | ❌              |

People outside a group get a **404** on its pages, not a 403 — the group's
existence isn't revealed to them. A leader cannot be removed from a group;
leadership has to be transferred first.

## Data model

```mermaid
erDiagram
    User ||--o{ GroupMembership : has
    Group ||--o{ GroupMembership : has
    Group ||--o{ MonthCycle : "one per month"
    Group ||--o{ ActivityLog : records
    MonthCycle ||--o{ DailyEntry : contains
    MonthCycle ||--o{ MonthlyEnrollment : has
    User ||--o{ DailyEntry : logs
    User ||--o{ ActivityLog : "acts on"

    User {
        int id PK
        string username UK
        string email UK
        string passwordHash
    }
    Group {
        int id PK
        string name
        string inviteCode UK
        int createdById FK
    }
    GroupMembership {
        int id PK
        int groupId FK
        int userId FK
        enum role "LEADER | MEMBER"
        bool isActive
        datetime leftAt
    }
    MonthCycle {
        int id PK
        int groupId FK
        int year
        int month
        bool isClosed
        decimal cachedTotalCost
        decimal cachedTotalMeals
        decimal cachedMealRate
    }
    DailyEntry {
        int id PK
        int monthCycleId FK
        int userId FK
        date date
        decimal lunch
        decimal dinner
        decimal cost
    }
    ActivityLog {
        int id PK
        int groupId FK
        int actorId FK
        int targetUserId FK
        date entryDate
        enum action "CREATE | UPDATE"
        string fieldName
        string oldValue
        string newValue
    }
```

Notes on the shape:

- `(groupId, userId)`, `(groupId, year, month)`, and
  `(monthCycleId, userId, date)` are unique — the database, not the app, is
  what stops duplicate memberships, month cycles, and daily entries.
- The three `cached*` fields on `MonthCycle` exist so the dashboard doesn't
  re-aggregate every entry on each page load. They are recomputed by
  `recalculateMonthCycle()` on every write, which is why all entry writes must
  go through `lib/mess-service.ts`.
- `lunch` and `dinner` are `Decimal(3,1)`, not integers, so a day can hold
  `1.5` meals.
- `MonthlyEnrollment` is carried over from the Django schema but isn't used by
  any screen yet.

## Routes

| Route                                     | Who         | Purpose                              |
| ----------------------------------------- | ----------- | ------------------------------------ |
| `/`                                       | anyone      | Landing page                         |
| `/signup`, `/login`                       | anonymous   | Create an account / sign in          |
| `/profile`                                | signed in   | Account details, password, group tools |
| `/groups`                                 | signed in   | Redirects to your group's dashboard  |
| `/groups/create`, `/groups/join`          | signed in   | Start a group or join by invite code |
| `/groups/[groupId]/members/add`           | leader      | Add a member by username             |
| `/groups/[groupId]/transfer-leadership`   | leader      | Hand over leadership                 |
| `/mess/[groupId]/dashboard`               | member      | Month totals and member balances     |
| `/mess/[groupId]/details`                 | member      | Day-by-day meal grid                 |
| `/mess/[groupId]/my-calculation`          | member      | Your own figures for the month       |
| `/mess/[groupId]/entry`                   | member      | Log your own meals and cost          |
| `/mess/[groupId]/entry/[userId]`          | leader/self | Log meals for a specific member      |
| `/mess/[groupId]/extra-meal/[userId]`     | leader      | Add an extra meal for a member       |
| `/mess/[groupId]/logs`                    | leader      | Audit trail                          |

Month-aware pages accept `?year=&month=` or `?month_choice=YYYY-MM`, and fall
back to the current month for anything unparseable.

## Local setup

**Requirements:** Node.js 20.9+ (developed on 24) and PostgreSQL 14+.

1. **Create a Postgres database:**

   ```bash
   createdb mess_calculator_next
   ```

2. **Install dependencies** (this also runs `prisma generate`):

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`: point `DATABASE_URL` at the database you just made and set
   a real `AUTH_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Create the tables, and optionally load sample data:**

   ```bash
   npm run db:migrate
   npm run db:seed     # optional — one group, three users, five days of meals
   ```

   The seed creates `nayeem` (leader), `jhon`, and `rafi`, all with the password
   `messpass123`, in a group with invite code `seedmess`. It is idempotent.

5. **Run it:**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

## Scripts

| Command              | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Development server                                   |
| `npm run build`      | `prisma generate` + production build                 |
| `npm start`          | Serve the production build                           |
| `npm run typecheck`  | `tsc --noEmit`                                       |
| `npm run lint`       | ESLint                                               |
| `npm run db:migrate` | Create and apply a migration (development)           |
| `npm run db:deploy`  | Apply pending migrations (production)                |
| `npm run db:seed`    | Load sample data                                     |
| `npm run db:studio`  | Prisma Studio                                        |

## Environment variables

| Variable          | Required | What it's for                                                       |
| ----------------- | -------- | ------------------------------------------------------------------- |
| `DATABASE_URL`    | yes      | Postgres connection string, e.g. `postgresql://user:pass@localhost:5432/mess_calculator_next` |
| `AUTH_SECRET`     | yes      | Signs the session cookie. Generate a fresh one per environment.      |
| `AUTH_TRUST_HOST` | yes\*    | Set to `true` when self-hosting. Vercel sets it for you.             |
| `APP_TIME_ZONE`   | no       | Timezone for "today" and month boundaries. Defaults to `Asia/Dhaka`. |

\* Required for `npm start` and any non-Vercel deploy — see below.

## Deployment

Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, and `APP_TIME_ZONE`
on the host, then:

```bash
npm ci
npm run db:deploy    # applies migrations; never use db:migrate in production
npm run build
npm start
```

`AUTH_TRUST_HOST=true` is not optional when self-hosting — without it Auth.js
rejects every request with `UntrustedHost`, including under `npm start`
locally. It is only safe because a reverse proxy sets the `Host` header;
Vercel sets it for you.

## Project layout

```
prisma/
  schema.prisma        Data model; migrations live alongside in migrations/
  seed.ts              Development sample data
src/
  app/
    actions/           Server Actions — every write goes through one of these
    (pages)            One folder per route, mirroring the Django URLconf
  components/          Shared UI (header, form fields, confirm dialog, …)
  generated/prisma/    Prisma Client output (gitignored, rebuilt on install)
  lib/
    auth.ts            Auth.js instance with the Credentials provider
    date.ts            Timezone-aware "today" and month helpers
    guards.ts          Route guards: failed checks → 403 / 404
    mess-service.ts    The only module allowed to write DailyEntry rows
    permissions.ts     Pure permission predicates (no routing imports)
    session.ts         currentUser() / requireUser()
    validation.ts      Zod schemas and the Django-equivalent password rules
  auth.config.ts       Edge-safe Auth.js config, shared with the proxy
  proxy.ts             Route protection (Next 16's replacement for middleware)
```

## How the Django concepts map over

| Django                                    | Here                                                     |
| ----------------------------------------- | -------------------------------------------------------- |
| `AUTH_USER_MODEL` + `UserCreationForm`    | `User` model, `signup` action, bcrypt hashes              |
| `@login_required`                         | `authorized` callback in `auth.config.ts`, via `proxy.ts` |
| `PermissionDenied` / `handler403`         | `forbidden()` → `app/forbidden.tsx`                       |
| `get_object_or_404` / `handler404`        | `notFound()` → `app/not-found.tsx`                        |
| `groups/permissions.py`                   | `lib/permissions.ts` (predicates) + `lib/guards.ts`       |
| `mess/services.py`                        | `lib/mess-service.ts`                                     |
| `mess/signals.py` (cache recalculation)   | `recalculateMonthCycle()`, called by every write path     |
| Forms + `{{ form.errors }}`               | Zod schemas + `useActionState` + `FormState`              |
| `{% csrf_token %}`                        | Built into Server Actions                                 |
| Django admin                              | `npm run db:studio`                                       |

### Rules worth keeping

- **All `DailyEntry` writes go through `lib/mess-service.ts`.** Never call
  `prisma.dailyEntry.create()/update()` from a page or action — the audit log
  would go stale, the cached month totals would drift, and the leader/member
  permission rule wouldn't be enforced.
- **`ActivityLog` is append-only.** Nothing in the app updates or deletes those
  rows.
- **Non-members get 404, not 403,** for a group's pages — a group's existence
  isn't revealed to people outside it.
- **Calendar dates are stored as UTC midnight.** Build them with `utcDate()` in
  `lib/date.ts`; "today" resolves in `APP_TIME_ZONE`, not the server's zone.

## Not carried over

The Django project's `notifications` app was an empty placeholder for a monthly
summary email, so there is nothing here for it yet. Closing a month works; the
"email the summary to the group" step it was meant to enable is still to be
built.
