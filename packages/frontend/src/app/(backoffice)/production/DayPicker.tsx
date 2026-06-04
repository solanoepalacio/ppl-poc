'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Production day selector: a native date input that navigates to the selected
 * day immediately on change — no submit button. The chosen day lives in the URL
 * (?day=YYYY-MM-DD); clearing the input drops the param so the server defaults
 * to today.
 */
export function DayPicker({ day }: { day: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const url = next
      ? `/production?day=${encodeURIComponent(next)}`
      : '/production';
    startTransition(() => router.push(url));
  }

  return (
    <div className="card">
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
  );
}
