/**
 * How an order came to exist.
 *
 * SQLite has no native enums, so the backend stores `Order.source` as a plain
 * string validated against this union in the service layer (mirroring SlotStatus
 * and ProductCategory).
 *
 * The distinction is what lets link generation be repeated safely. A manually
 * transcribed order also carries an unused token and an unset `consumedAt`, so
 * it is otherwise indistinguishable from a live customer link — and handing one
 * to a customer would append their items to the manager's, doubling that
 * product's production totals. Only a `link` order may be handed back.
 *
 * - `link` — created by generating a shareable customer link.
 * - `manual` — transcribed in the back office from an order received
 *   off-channel. Also the value orders predating the distinction carry, since
 *   nothing can recover their real origin.
 */
export type OrderSource = 'link' | 'manual';

export const ORDER_SOURCES: readonly OrderSource[] = ['link', 'manual'];

export function isOrderSource(value: unknown): value is OrderSource {
  return (
    typeof value === 'string' && (ORDER_SOURCES as readonly string[]).includes(value)
  );
}
