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
      className="ml-2.5 inline"
      action={removeMember.bind(null, groupId, userId)}
      title="Remove member?"
      confirmLabel="Remove member"
      message={() => (
        <>
          Are you sure you want to remove <strong>{username}</strong> from this group?
        </>
      )}
    >
      <button
        type="submit"
        className="cursor-pointer border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-bad hover:text-bad-dark hover:underline max-[680px]:text-[0.78rem]"
      >
        Remove
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
      <button type="submit" className="btn bg-sea hover:bg-sea-dark">
        Close month
      </button>
    </ConfirmForm>
  );
}
