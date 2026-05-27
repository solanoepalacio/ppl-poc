/**
 * The lifecycle status of an order. This union is the single source of truth
 * for the status contract shared between backend and frontend. The backend
 * stores it as a plain string column (SQLite has no native enums) and validates
 * against these values in the service layer.
 *
 * - `pending`  — created when the manager generates the link; not yet acted on.
 * - `issued`   — the customer confirmed the order through the form.
 * - `denied`   — the customer chose the "continue on WhatsApp" fallback.
 * - `ignored`  — the token expired while the order was still `pending`.
 */
export type OrderStatus = 'pending' | 'issued' | 'denied' | 'ignored';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'issued',
  'denied',
  'ignored',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}
