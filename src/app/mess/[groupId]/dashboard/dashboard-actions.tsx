"use client";

import { closeMonth } from "@/app/actions/mess";
import { removeMember } from "@/app/actions/groups";
import { ConfirmForm } from "@/components/confirm-form";

export function RemoveMemberButton({
  groupId,
  userId,
  username,
}: {
  groupId: number;
  userId: number;
  username: string;
}) {
  return (
    <ConfirmForm
      action={removeMember.bind(null, groupId, userId)}
      title="Remove member?"
      confirmLabel="Remove member"
      message={() => (
        <>
          Are you sure you want to remove <strong>{username}</strong> from this group?
        </>
      )}
    >
      {/* Styled as a menu row so it lines up with the links around it. */}
      <button type="submit" className="w-full text-left font-semibold text-bad hover:text-bad-dark">
        Remove member
      </button>
    </ConfirmForm>
  );
}

export function CloseMonthButton({
  groupId,
  year,
  month,
  monthLabel,
}: {
  groupId: number;
  year: number;
  month: number;
  monthLabel: string;
}) {
  return (
    <ConfirmForm
      action={closeMonth.bind(null, groupId)}
      title="Close month?"
      confirmLabel="Close month"
      message={() => (
        <>
          Close <strong>{monthLabel}</strong>? Entries cannot be changed afterward.
        </>
      )}
    >
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <button type="submit" className="btn btn-secondary">
        Close month
      </button>
    </ConfirmForm>
  );
}
