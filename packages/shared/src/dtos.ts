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
