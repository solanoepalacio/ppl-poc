'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotListItem } from '@pannico/shared';

/** e.g. "Bloque #3 · 12/6/2026 – 15/6/2026" or "Bloque #4 · 15/6/2026 (abierto)". */
export function slotLabel(slot: {
  seq: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
}): string {
  const opened = new Date(slot.openedAt).toLocaleDateString();
  if (slot.status === 'open') {
    return `Bloque #${slot.seq} · desde ${opened} (abierto)`;
  }
  const closed = slot.closedAt
    ? new Date(slot.closedAt).toLocaleDateString()
    : '';
  return `Bloque #${slot.seq} · ${opened} – ${closed}`;
}

/**
 * Back-office bloque selector: a `<select>` of every production bloque that
 * navigates to the chosen one immediately on change — no submit button. The
 * selected bloque lives in the URL (?slotId=...); when absent the server
 * defaults to the open bloque. Replaces the old day picker on both the orders
 * and production views. An optional `action` slot (e.g. the create-order
 * trigger) sits on the right of the same card.
 */
export function SlotPicker({
  basePath,
  slots,
  currentSlotId,
  action,
}: {
  basePath: string;
  slots: SlotListItem[];
  currentSlotId: string;
  action?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(nextId: string) {
    startTransition(() =>
      router.push(`${basePath}?slotId=${encodeURIComponent(nextId)}`),
    );
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
        <label htmlFor="slot">Bloque </label>
        <select
          id="slot"
          name="slot"
          value={currentSlotId}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        >
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slotLabel(slot)}
            </option>
          ))}
        </select>
      </div>
      {action}
    </div>
  );
}
