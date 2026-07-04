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

/** A single product's total quantity to produce for a bloque. */
export interface ProductionTotalItem {
  productId: string;
  name: string;
  quantity: number;
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
