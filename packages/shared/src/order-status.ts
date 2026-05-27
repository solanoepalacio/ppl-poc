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
 * - `finished` — the manager marked the order as completed from the back office.
 */
export type OrderStatus =
  | 'pending'
  | 'issued'
  | 'denied'
  | 'ignored'
  | 'finished';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'issued',
  'denied',
  'ignored',
  'finished',
];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === 'string' &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Statuses that count toward the day's production totals: orders that represent
 * real demand to fulfill. `denied` (customer left for WhatsApp) and `ignored`
 * (token expired unused) are deliberately excluded. Single source of truth for
 * the production-totals aggregation.
 */
export const PRODUCTION_STATUSES: readonly OrderStatus[] = [
  'pending',
  'issued',
  'finished',
];
