import type { OrderItem } from './models';
import type { OrderStatus } from './order-status';
import type { Product } from './models';

/** `POST /links` request: the manager supplies a customer phone number. */
export interface CreateLinkRequest {
  phone: string;
}

/** `POST /links` response: the shareable custom URL plus order context. */
export interface CreateLinkResponse {
  orderId: string;
  phone: string;
  token: string;
  /** Fully-qualified custom URL the manager shares over WhatsApp. */
  url: string;
  expiresAt: string;
}

/**
 * `GET /orders/by-token/:token` response. When `valid` is true the catalog is
 * present so the form can render; when false the form shows the invalid-link page.
 */
export interface TokenValidationResponse {
  valid: boolean;
  phone?: string;
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

/** `PATCH /orders/:id/status` request: the manager sets a new order status. */
export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

/** `PATCH /orders/:id/status` response: the updated order id and status. */
export interface UpdateOrderStatusResponse {
  id: string;
  status: OrderStatus;
}

/**
 * `POST /orders` request: the manager records an order received off-channel.
 * `items` defaults to empty and `status` defaults to `issued` when omitted.
 */
export interface CreateOrderRequest {
  phone: string;
  items?: ConfirmOrderItem[];
  status?: OrderStatus;
}

/** `POST /orders` response: the created order id and status. */
export interface CreateOrderResponse {
  id: string;
  status: OrderStatus;
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

/** An order as shown in the back-office day view. */
export interface DayViewOrder {
  id: string;
  phone: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

/** `GET /orders?day=YYYY-MM-DD` response. */
export interface DayViewResponse {
  day: string;
  orders: DayViewOrder[];
}

/** A single product's total quantity to produce for a day. */
export interface ProductionTotalItem {
  productId: string;
  name: string;
  quantity: number;
}

/**
 * `GET /orders/production?day=YYYY-MM-DD` response: per-item production totals
 * for the day, one entry per product with a positive total, sorted by name.
 */
export interface ProductionTotalsResponse {
  day: string;
  items: ProductionTotalItem[];
}
