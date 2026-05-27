'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUSES, type OrderStatus } from '@pannico/shared';
import { updateOrderStatus } from '@/lib/api';

/**
 * Back-office status control: a `<select>` of every valid status that lets the
 * manager set an order to any status (free-form transitions). On change it
 * persists via the API, then refreshes the server-rendered list to reconcile.
 */
export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  async function onChange(next: OrderStatus) {
    if (next === status) return;
    setError(false);
    try {
      await updateOrderStatus(orderId, next);
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    }
  }

  return (
    <span className="status-select">
      <span className={`status-dot status-${status}`} aria-hidden />
      <select
        aria-label="Order status"
        value={status}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value as OrderStatus)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {error && <span className="muted"> · failed</span>}
    </span>
  );
}
