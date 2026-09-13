"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { getDailyEntryValuesForDates, saveBulkDailyEntries } from "@/app/actions/mess";
import { FieldErrors, NonFieldErrors } from "@/components/form-fields";
import { MealField } from "@/components/meal-field";
import { SubmitButton } from "@/components/submit-button";
import { formatISODateLabel } from "@/lib/date";
import { emptyFormState } from "@/lib/form";
import type { DailyEntryValues } from "@/lib/mess-service";

export function BulkEntryForm({
  groupId,
  targetUserId,
}: {
  groupId: number;
  targetUserId: number;
}) {
  const [state, formAction] = useActionState(
    saveBulkDailyEntries.bind(null, groupId, targetUserId),
    emptyFormState,
  );

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [prefillCache, setPrefillCache] = useState<Record<string, DailyEntryValues>>({});
  const [isPending, setIsPending] = useState(false);
  const calendarRef = useRef<HTMLElement>(null);

  // Cally calls customElements.define on import, so it can only load in the browser.
  useEffect(() => {
    void import("cally");
  }, []);

  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    async function onChange(event: Event) {
      const raw = (event.target as HTMLElement & { value?: string }).value ?? "";
      const next = [...new Set(raw.split(" ").filter(Boolean))].sort();
      const added = next.filter((date) => !selectedDates.includes(date));

      const needsFetch = added.filter((date) => !(date in prefillCache));
      if (needsFetch.length > 0) {
        setIsPending(true);
        try {
          const fetched = await getDailyEntryValuesForDates(groupId, targetUserId, needsFetch);
          setPrefillCache((cache) => ({ ...cache, ...fetched }));
        } finally {
          setIsPending(false);
        }
      }
      setSelectedDates(next);
    }

    calendar.addEventListener("change", onChange);
    return () => calendar.removeEventListener("change", onChange);
  }, [selectedDates, prefillCache, groupId, targetUserId]);

  return (
    <form action={formAction}>
      <NonFieldErrors state={state} />

      <div className="mb-6">
        <p className="field-label mb-2">Pick the days to log</p>
        <div className="inline-block max-w-full overflow-x-auto rounded-(--radius-box) border border-line bg-base-100 p-2 max-[520px]:p-1 max-[520px]:text-[0.85rem]">
          <calendar-multi ref={calendarRef} className="cally">
            <calendar-month />
          </calendar-multi>
        </div>
        <p className="muted mt-2 text-sm max-[520px]:text-[0.8rem]">
          Click a day to add it below with its existing record, or click it again to remove it.
          {isPending ? " Loading…" : ""}
        </p>
      </div>

      <input type="hidden" name="dates" value={selectedDates.join(",")} />

      {selectedDates.length === 0 ? (
        <p className="muted mb-6">No days selected yet.</p>
      ) : (
        <div className="mb-6 flex flex-col gap-4 max-[520px]:gap-3">
          {selectedDates.map((dateIso) => (
            <DayCard
              key={dateIso}
              dateIso={dateIso}
              values={prefillCache[dateIso]}
              errors={state.errors?.[dateIso]}
            />
          ))}
        </div>
      )}

      <SubmitButton className="btn btn-accent btn-lg btn-block max-[520px]:btn-md" pendingLabel="Saving…">
        Save {selectedDates.length || ""} day{selectedDates.length === 1 ? "" : "s"}
      </SubmitButton>
    </form>
  );
}

function DayCard({
  dateIso,
  values,
  errors,
}: {
  dateIso: string;
  values: DailyEntryValues | undefined;
  errors?: string[];
}) {
  const { lunch, dinner, cost, maidAbsent } = values ?? {
    lunch: false,
    dinner: false,
    cost: "",
    maidAbsent: { lunch: false, dinner: false },
  };
  return (
    <div className="rounded-(--radius-box) border border-line bg-base-200/40 p-4 max-[520px]:p-3">
      <div className="mb-3 font-semibold max-[520px]:mb-2 max-[520px]:text-[0.95rem]">
        {formatISODateLabel(dateIso)}
      </div>
      <FieldErrors messages={errors} />
      <div className="mb-3 grid grid-cols-2 gap-3 max-[520px]:grid-cols-1 max-[520px]:gap-2">
        <MealField
          name={`lunch_${dateIso}`}
          label="Lunch eaten"
          defaultChecked={lunch}
          maidAbsentName={`maid_absent_lunch_${dateIso}`}
          defaultMaidAbsent={maidAbsent.lunch}
        />
        <MealField
          name={`dinner_${dateIso}`}
          label="Dinner eaten"
          defaultChecked={dinner}
          maidAbsentName={`maid_absent_dinner_${dateIso}`}
          defaultMaidAbsent={maidAbsent.dinner}
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`id_cost_${dateIso}`}>
          Cost
        </label>
        <input
          className="input w-full max-[520px]:input-sm max-[520px]:text-sm"
          id={`id_cost_${dateIso}`}
          name={`cost_${dateIso}`}
          type="number"
          step="0.01"
          min="0"
          defaultValue={cost}
        />
      </div>
    </div>
  );
}
