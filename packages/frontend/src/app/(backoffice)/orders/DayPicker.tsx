'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Back-office day selector: a native date input that navigates to the selected
 * day immediately on change — no submit button. The chosen day lives in the URL
 * (?day=YYYY-MM-DD); clearing the input drops the param so the server defaults
 * to today. An optional `action` slot (e.g. the create-order trigger) sits on
 * the right of the same card.
 */
export function DayPicker({ day, action }: { day: string; action?: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const url = next ? `/orders?day=${encodeURIComponent(next)}` : '/orders';
    startTransition(() => router.push(url));
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <label htmlFor="day">Día </label>
        <input
          id="day"
          name="day"
          type="date"
          value={day}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {action}
    </div>
  );
}
