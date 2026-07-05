'use client';

import { useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotListItem } from '@pannico/shared';
import { slotLabel } from './slotLabel';

/**
 * Back-office bloque toolbar: the slate header bar over the orders view. On the
 * left, a `<select>` of every production bloque that navigates to the chosen one
 * immediately on change — no submit button; the selection lives in the URL
 * (?slotId=...), and when absent the server defaults to the open bloque. On the
 * right, the bloque-action buttons (passed as `action`), preceded by a "Bloque
 * cerrado" pill when a closed bloque is selected.
 */
export function SlotPicker({
  basePath,
  slots,
  currentSlotId,
  closed,
  action,
}: {
  basePath: string;
  slots: SlotListItem[];
  currentSlotId: string;
  /** True when the selected bloque is not the open one (actions are disabled). */
  closed?: boolean;
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
    <div className="bo-toolbar">
      <div className="bo-toolbar-left">
        <label htmlFor="slot" className="bo-toolbar-label">
          Bloque
        </label>
        <select
          id="slot"
          name="slot"
          className="bo-select"
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
      {action && (
        <div className="bo-toolbar-actions">
          {closed && <span className="bo-closed-pill">Bloque cerrado</span>}
          {action}
        </div>
      )}
    </div>
  );
}
