import type { OrderItem } from './models';
import type { Product } from './models';
import type { Slot } from './slot';

/** `POST /links` request: the manager selects a client from the directory. */
export interface CreateLinkRequest {
  clientId: string;
}

/** `POST /links` response: the shareable custom URL plus order context. */
export interface CreateLinkResponse {
  orderId: string;
  clientId: string;
  /** Display name of the client the order is for. */
  clientName: string;
  token: string;
  /** Fully-qualified custom URL the manager shares over WhatsApp. */
  url: string;
  /**
   * Human-facing sequence number of the production bloque the link is valid for.
   * The link stays valid until that bloque is closed (no fixed expiry time).
   */
  slotSeq: number;
}

/**
 * `GET /orders/by-token/:token` response. When `valid` is true the catalog is
 * present so the form can render; when false the form shows the invalid-link page.
 */
export interface TokenValidationResponse {
  valid: boolean;
  /** Display name of the client the order is for, when the token is valid. */
  clientName?: string;
  catalog?: Product[];
}

/** A single chosen line in a confirm-order submission. */
export interface ConfirmOrderItem {
  productId: string;
  quantity: number;
}

/** `POST /orders/by-token/:token/confirm` request. */
export interface ConfirmOrderRequest {
  items: ConfirmOrderItem[];
}

/**
 * `POST /orders` request: the manager records an order received off-channel.
 * `items` defaults to empty when omitted.
 */
export interface CreateOrderRequest {
  clientId: string;
  items?: ConfirmOrderItem[];
  /** Optional raw customer message (e.g. pasted WhatsApp text) for manually
   * transcribed orders. Blank/absent stores no message. */
  message?: string;
}

/** `POST /orders` response: the created order id. */
export interface CreateOrderResponse {
  id: string;
}

/**
 * `PATCH /orders/:id/items` request: the complete desired item list for the
 * order. An empty list clears the order's items.
 */
export interface ReplaceOrderItemsRequest {
  items: ConfirmOrderItem[];
}

/** `PATCH /orders/:id/items` response: the order id and its new item list. */
export interface ReplaceOrderItemsResponse {
  id: string;
  items: OrderItem[];
}

/** `DELETE /orders/:id` response: the id of the removed order. */
export interface DeleteOrderResponse {
  id: string;
}

/** An order as shown in the back-office bloque view. */
export interface SlotViewOrder {
  id: string;
  clientId: string;
  /** Display name of the client the order is for. */
  clientName: string;
  createdAt: string;
  items: OrderItem[];
}

/**
 * `GET /orders?slotId=` response: the orders in a bloque (the open one when no
 * `slotId` is given), plus the resolved bloque itself for the header/picker.
 */
export interface SlotOrdersResponse {
  slot: Slot;
  orders: SlotViewOrder[];
}

/**
 * A single product's production breakdown for a bloque: how many are needed, how
 * many are already in stock, how many have been baked so far, and the difference
 * still to bake.
 */
export interface ProductionTotalItem {
  productId: string;
  name: string;
  /** Total demanded across the bloque's orders (summed order quantities). */
  demand: number;
  /** Recorded existencia (stock on hand) for the bloque; 0 when none recorded. */
  existence: number;
  /**
   * Recorded producción real (units already baked during the bloque); 0 when
   * none recorded.
   */
  produced: number;
  /**
   * Net units still to produce: `max(0, demand − existence − produced)`. Floored
   * at zero — a product covered by existencia and what has already been baked
   * shows 0, never a negative surplus.
   */
  toProduce: number;
}

/**
 * `GET /orders/production?slotId=` response: per-item production totals for the
 * bloque (the open one when no `slotId` is given), one entry per product with a
 * positive total, sorted by name.
 */
export interface ProductionTotalsResponse {
  slot: Slot;
  items: ProductionTotalItem[];
}

/**
 * A single product's manually-entered existencia (stock on hand) for a bloque,
 * subtracted from that product's production total.
 */
export interface ExistenceItem {
  productId: string;
  quantity: number;
}

/**
 * `GET /slots/:id/existence` response: the recorded existencia for the bloque,
 * one entry per product with a positive quantity. Products without a row have
 * zero existence.
 */
export interface SlotExistenceResponse {
  slot: Slot;
  items: ExistenceItem[];
}

/**
 * `PUT /slots/:id/existence` request: the complete desired existencia for the
 * bloque (replace-all). Zero-quantity entries clear a product's existence.
 */
export interface SetExistenceRequest {
  items: ExistenceItem[];
}

/**
 * One recorded batch of producción real: how many units came out of the oven and
 * when it was recorded. These are the history the manager reviews under a
 * product's "Ver detalle" — a wrong batch is corrected or deleted here, at the
 * entry, rather than by overwriting a total.
 */
export interface ProducedEntry {
  id: string;
  quantity: number;
  /** ISO timestamp of when the batch was recorded. */
  createdAt: string;
}

/**
 * A product's producción real for a bloque: its entries and their sum. `total` is
 * derived, never stored — the entries are the source of truth, so the only way to
 * change the total is to change them.
 */
export interface ProducedProduct {
  productId: string;
  name: string;
  /** Sum of `entries`, always above zero (a product with none is not reported). */
  total: number;
  /** Oldest first, so the history reads in the order the work happened. */
  entries: ProducedEntry[];
}

/**
 * `GET /slots/:id/produced` response: the bloque's producción real grouped by
 * product, sorted by product name. Only products with at least one entry appear;
 * a product with none has produced zero.
 */
export interface SlotProducedResponse {
  slot: Slot;
  items: ProducedProduct[];
}

/**
 * One product's desired entries in a {@link SetProducedRequest}. An entry with an
 * `id` is an existing one being kept — its quantity is updated and its
 * `createdAt` preserved. An entry without an `id` is new and the server stamps
 * it. Existing entries the client does not send are deleted, so omitting a
 * product entirely (or sending it with no entries) clears its producción real.
 */
export interface SetProducedProduct {
  productId: string;
  entries: { id?: string; quantity: number }[];
}

/**
 * `PUT /slots/:id/produced` request: the complete desired history for the bloque
 * (replace-all over entries).
 *
 * Unlike existencia this is not idempotent, and that is a deliberate trade rather
 * than an oversight: entries without an `id` are new, so replaying the same body
 * appends the new ones twice. What makes that acceptable is the history itself —
 * a duplicated batch is visible under the product's detail and removable with one
 * control, where a silently doubled total would not be. The alternative,
 * incrementing a single stored figure, offers neither.
 */
export interface SetProducedRequest {
  items: SetProducedProduct[];
}

/**
 * A product's stock position within a bloque. `initial` is the manually entered
 * (or inherited) stock inicial; `current` is the derived stock actual.
 *
 * `current` is never stored — it is `initial + produced − demand`, recomputed on
 * every read. That is what makes it read-only: there is nothing to write it to,
 * and each of its three inputs has its own control. It MAY be negative, since
 * real production is recorded after the orders arrive.
 */
export interface SlotStockItem {
  productId: string;
  name: string;
  /** Stock inicial: typed by the manager or inherited from the previous bloque. */
  initial: number;
  /** Producción real summed over the bloque's recorded batches. */
  produced: number;
  /** Demand summed across the bloque's orders. */
  demand: number;
  /** `initial + produced − demand`. Negative means the product is in shortfall. */
  current: number;
}

/**
 * `GET /slots/:id/stock` response: the bloque's stock position per product,
 * sorted by product name.
 *
 * Reports every product with any activity in the bloque — a stock inicial, a
 * recorded batch, or demand. The three underlying sources each mention a
 * different set of products, so the union is computed server-side; a product
 * baked but never ordered nor counted is known to exactly one of them.
 *
 * Note this deliberately includes products in shortfall, which the stock control
 * does not display. The control applies that filter itself, because a manager
 * adding such a product to give it a stock inicial needs its real demand and
 * production to see a truthful stock actual. A product absent here has no
 * activity at all, so its produced and demand are both zero.
 */
export interface SlotStockResponse {
  slot: Slot;
  items: SlotStockItem[];
}

/** A product of the open bloque whose stock actual is below zero. */
export interface SlotShortfallItem {
  productId: string;
  name: string;
  /** How many units short — a positive number, the magnitude of the deficit. */
  shortfall: number;
}

/**
 * `GET /slots/close-preview` response: what closing the open bloque would discard.
 *
 * Advisory only. A shortfall cannot carry (stock inicial is never negative), so
 * closing drops it; this lets the back office say so before it happens. The server
 * clamps identically whether or not this was called.
 */
export interface CloseSlotPreviewResponse {
  slot: Slot;
  shortfalls: SlotShortfallItem[];
}

/** `POST /clients` body. The slug is derived from `name`, never supplied. */
export interface CreateClientRequest {
  name: string;
  /** Free-form as typed; stored as digits. Absent or blank means no phone. */
  phone?: string | null;
}

/**
 * `PATCH /clients/:id` body — every field optional, so a caller can change one
 * without restating the others. The slug is absent on purpose: it is the natural
 * key data migrations upsert on, so renaming a client leaves its identity intact.
 */
export interface UpdateClientRequest {
  name?: string;
  phone?: string | null;
  /** `false` retires the client, `true` reinstates it. */
  active?: boolean;
}

/**
 * `DELETE /clients/:id` response. Removal is two operations depending on whether
 * any order references the client, and the caller should not have to re-query to
 * find out which one happened.
 */
export interface DeleteClientResponse {
  id: string;
  /** `deleted` — no orders referenced it. `deactivated` — some did, so it was retired. */
  outcome: 'deleted' | 'deactivated';
}

/**
 * One conversation a person is currently handling, as the back office sees it.
 *
 * Identified by the customer's number rather than by a client: a handover can
 * belong to a number that matches nobody in the directory, and that is precisely
 * the conversation most likely to need a person.
 */
export interface WhatsappHandoff {
  /** The customer's canonical number — what identifies the conversation. */
  sender: string;
  /** The client that number belongs to, or `null` when it matches none. */
  clientName: string | null;
  startedAt: string;
  /** When it lapses on its own, unless the customer writes again first. */
  expiresAt: string;
}

/**
 * `GET /whatsapp/handoffs` response: only the ones still holding, newest activity
 * first.
 *
 * `enabled` rather than a 404 when the agent has no credentials. The control
 * needs to say "the agent is not set up" — which is a state — and a 404 is
 * indistinguishable from a wrong URL.
 */
export interface WhatsappHandoffsResponse {
  enabled: boolean;
  handoffs: WhatsappHandoff[];
}

/**
 * `DELETE /whatsapp/handoffs/:sender` response.
 *
 * `false` is a success, not a failure: it means the handover was already gone —
 * lapsed, or ended by somebody else. Two people ending the same conversation is
 * expected, and both of them wanted the state that now holds.
 */
export interface EndWhatsappHandoffResponse {
  ended: boolean;
}
