'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ORDER_STATUSES, type OrderStatus } from '@pannico/shared';
import { updateOrderStatus } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

/** Spanish display labels for each stored status value (display-only; the
 *  underlying enum value sent to the API is unchanged). */
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'pendiente',
  issued: 'emitida',
  denied: 'rechazada',
  ignored: 'ignorada',
  finished: 'finalizada',
};

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
      trackEvent('order_status_changed', { fromStatus: status, toStatus: next });
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    }
  }

  return (
    <span className="status-select">
      <span className="status-label">Estado</span>
      <select
        aria-label="Estado de la orden"
        value={status}
        disabled={pending}
        onChange={(e) => void onChange(e.target.value as OrderStatus)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {error && <span className="muted"> · falló</span>}
    </span>
  );
}
