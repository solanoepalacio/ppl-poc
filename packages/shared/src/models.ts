import type { OrderStatus } from './order-status';

/** A product in the predefined catalog. */
export interface Product {
  id: string;
  name: string;
  active: boolean;
}

/** An item recorded on an order once the customer confirms. */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
}

/** An order, created in `pending` status when the manager generates a link. */
export interface Order {
  id: string;
  /** Customer phone number, normalized to E.164, bound to the order's token. */
  phone: string;
  /** URL-safe, single-use token embedded in the customer link. */
  token: string;
  status: OrderStatus;
  /** After this instant the token is invalid and a pending order becomes ignored. */
  expiresAt: string;
  createdAt: string;
  /** Set when the customer confirms (status → issued). */
  confirmedAt?: string | null;
  /** Items recorded on confirmation; empty until then. */
  items?: OrderItem[];
}
