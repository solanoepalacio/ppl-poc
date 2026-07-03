import type { OrderStatus } from './order-status';
import type { ProductCategory } from './product-category';

/** A product in the predefined catalog. */
export interface Product {
  id: string;
  name: string;
  active: boolean;
  /** The production line this product is baked on (*salados* / *dulces*). */
  category: ProductCategory;
}

/**
 * A client an order can be attached to. The directory is a fixed preset list
 * loaded via data migrations (no management UI). `name` is the UI-friendly
 * display name; `slug` is a normalized, unique natural key.
 */
export interface Client {
  id: string;
  name: string;
  slug: string;
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
  /** The client this order is for (references `Client.id`). */
  clientId: string;
  /** URL-safe, single-use token embedded in the customer link. */
  token: string;
  status: OrderStatus;
  /**
   * The production bloque this order belongs to (the open one at creation). The
   * order's token is valid only while this bloque is open.
   */
  slotId: string;
  createdAt: string;
  /** Set when the customer confirms (status → issued). */
  confirmedAt?: string | null;
  /** Items recorded on confirmation; empty until then. */
  items?: OrderItem[];
}
