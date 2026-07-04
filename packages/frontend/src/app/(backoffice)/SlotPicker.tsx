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
 * defaults to the open bloque. An optional `action` slot (the bloque-action
 * buttons) sits in a left-aligned row below the selector, in the same card.
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
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '0.85rem',
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
      {action && <div className="slot-actions">{action}</div>}
    </div>
  );
}
