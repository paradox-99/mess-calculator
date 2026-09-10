import Link from "next/link";
import type { Metadata } from "next";

import { PasswordForm, ProfileDetailsForm } from "./profile-forms";
import { activeMembership } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const membership = await activeMembership(user.id);

  return (
    <section className="mx-auto my-10 max-w-[920px] max-[680px]:my-6">
      <div className="mb-7">
        <h1 className="m-0 text-[clamp(2rem,5vw,2.8rem)] text-navy">My profile</h1>
        <p className="muted mt-1.5">Update your account and access your mess tools.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
        <section className="card border border-line border-t-4 border-t-sea bg-base-100 p-6 shadow-[0_10px_24px_rgba(23,43,58,0.05)]">
          <h2 className="card-title mb-1.5 text-[1.15rem] text-brand">Account details</h2>
          <p className="mb-5 text-[0.9rem] text-muted">
            Change your username, name, and email address.
          </p>
          <ProfileDetailsForm
            defaults={{
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }}
          />
        </section>

        <section className="card border border-line border-t-4 border-t-flame bg-base-100 p-6 shadow-[0_10px_24px_rgba(23,43,58,0.05)]">
          <h2 className="card-title mb-1.5 text-[1.15rem] text-brand">Change password</h2>
          <p className="mb-5 text-[0.9rem] text-muted">
            Use a strong password you do not reuse elsewhere.
          </p>
          <PasswordForm />
        </section>
      </div>

      {membership ? (
        <section className="card mt-4 border border-sand bg-parchment p-6">
          <h2 className="card-title mb-1.5 text-[1.15rem] text-gold-ink">
            {membership.group.name}
          </h2>
          <p className="mb-4 text-muted">Monthly tools and group controls for your current mess.</p>
          {membership.role === "LEADER" ? (
            <span className="badge badge-success badge-soft badge-lg mb-4 font-bold">
              Invitation code: {membership.group.inviteCode}
            </span>
          ) : null}
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/mess/${membership.groupId}/my-calculation`}
              className="btn btn-secondary max-[680px]:flex-[1_1_100%]"
            >
              My calculation
            </Link>
            {membership.role === "LEADER" ? (
              <Link
                href={`/groups/${membership.groupId}/transfer-leadership`}
                className="btn btn-neutral max-[680px]:flex-[1_1_100%]"
              >
                Transfer leadership
              </Link>
            ) : null}
            <Link
              href={`/mess/${membership.groupId}/dashboard`}
              className="btn btn-neutral max-[680px]:flex-[1_1_100%]"
            >
              Open dashboard
            </Link>
          </div>
        </section>
      ) : null}

      <Link href="/" className="back-link">
        ← Back home
      </Link>
    </section>
  );
}
