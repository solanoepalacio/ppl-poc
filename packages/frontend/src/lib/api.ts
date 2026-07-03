import type {
  Client,
  CloseSlotResponse,
  ConfirmOrderItem,
  CreateLinkResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DeleteOrderResponse,
  OrderStatus,
  Product,
  ProductionTotalsResponse,
  ReplaceOrderItemsResponse,
  Slot,
  SlotListResponse,
  SlotOrdersResponse,
  TokenValidationResponse,
  UpdateOrderStatusResponse,
} from '@pannico/shared';

/**
 * Backend API base URL, resolved per execution context:
 *
 * - In the browser, calls go to a relative path (`/api`) that Next.js rewrites
 *   to the backend (see next.config.js). The backend is never exposed directly,
 *   so the browser only ever talks to the frontend's own origin.
 * - On the server (server components, route handlers), `fetch` needs an
 *   absolute URL, so we hit the backend directly over the internal network via
 *   BACKEND_INTERNAL_URL.
 *
 * Both are overridable via env; the defaults match the local dev setup.
 */
export const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    } catch {
      /* non-JSON error body; keep the default message */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function validateToken(token: string): Promise<TokenValidationResponse> {
  return request<TokenValidationResponse>(
    `/orders/by-token/${encodeURIComponent(token)}`,
  );
}

export function confirmOrder(
  token: string,
  items: ConfirmOrderItem[],
): Promise<{ status: 'issued' }> {
  return request(`/orders/by-token/${encodeURIComponent(token)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function continueOnWhatsapp(
  token: string,
): Promise<{ status: 'denied' }> {
  return request(`/orders/by-token/${encodeURIComponent(token)}/whatsapp`, {
    method: 'POST',
  });
}

export function createLink(clientId: string): Promise<CreateLinkResponse> {
  return request<CreateLinkResponse>(`/links`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export function getClients(): Promise<Client[]> {
  return request<Client[]>(`/clients`);
}

export function getOrdersBySlot(slotId?: string): Promise<SlotOrdersResponse> {
  const qs = slotId ? `?slotId=${encodeURIComponent(slotId)}` : '';
  return request<SlotOrdersResponse>(`/orders${qs}`);
}

export function getProductionTotals(
  slotId?: string,
): Promise<ProductionTotalsResponse> {
  const qs = slotId ? `?slotId=${encodeURIComponent(slotId)}` : '';
  return request<ProductionTotalsResponse>(`/orders/production${qs}`);
}

export function getSlots(): Promise<SlotListResponse> {
  return request<SlotListResponse>(`/slots`);
}

export function getOpenSlot(): Promise<Slot> {
  return request<Slot>(`/slots/open`);
}

export function closeCurrentSlot(): Promise<CloseSlotResponse> {
  return request<CloseSlotResponse>(`/slots/close`, { method: 'POST' });
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>(`/products`);
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<UpdateOrderStatusResponse> {
  return request<UpdateOrderStatusResponse>(
    `/orders/${encodeURIComponent(orderId)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export function createOrder(
  input: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  return request<CreateOrderResponse>(`/orders`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function replaceOrderItems(
  orderId: string,
  items: ConfirmOrderItem[],
): Promise<ReplaceOrderItemsResponse> {
  return request<ReplaceOrderItemsResponse>(
    `/orders/${encodeURIComponent(orderId)}/items`,
    { method: 'PATCH', body: JSON.stringify({ items }) },
  );
}

export function deleteOrder(orderId: string): Promise<DeleteOrderResponse> {
  return request<DeleteOrderResponse>(
    `/orders/${encodeURIComponent(orderId)}`,
    { method: 'DELETE' },
  );
}
