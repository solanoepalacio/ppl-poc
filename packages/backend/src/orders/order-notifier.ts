/**
 * The seam between an order being confirmed and anyone who wants to know.
 *
 * It exists so the order path does not have to name a messaging channel. Orders
 * announce a fact about themselves; whatever carries that fact to a customer —
 * today the WhatsApp agent, tomorrow whatever replaces it — implements this and
 * registers itself. The arrow points that way on purpose: the agent was built to
 * be lifted out whole, and a direct call from `OrdersService` would have made
 * removing it a change to the order path.
 *
 * Optional by construction. Nothing provides it in a deployment without the
 * agent, and an order confirms exactly as it always did.
 */
export const ORDER_NOTIFIER = Symbol('ORDER_NOTIFIER');

export interface OrderNotifier {
  /**
   * Called once, after the order is recorded and its link consumed.
   *
   * MUST NOT throw and MUST NOT be relied upon to finish: the customer's
   * confirmation is already committed by the time this runs, and nothing a
   * notifier does can put that back. Failures belong in its own log.
   */
  orderConfirmed(orderId: string): void;
}
