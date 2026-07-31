import type {
  Client,
  CloseSlotResponse,
  ConfirmOrderItem,
  CreateLinkResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DeleteOrderResponse,
  ExistenceItem,
  Product,
  ProductCategory,
  ProductionTotalsResponse,
  ReplaceOrderItemsResponse,
  Slot,
  SlotExistenceResponse,
  SlotListResponse,
  SlotOrdersResponse,
  TokenValidationResponse,
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

/**
 * Error thrown by {@link request} for any non-2xx response, carrying the HTTP
 * `status` so callers can branch on it (e.g. a 404 on a token endpoint means the
 * link is no longer valid). Still an `Error` with the server's message, so
 * existing `e instanceof Error` / `e.message` handling keeps working.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

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
    throw new ApiError(res.status, message);
  }
  // Some endpoints (e.g. confirm) return 200 with an empty body; `res.json()`
  // would throw on that, so read text first and only parse when there is a body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function validateToken(token: string): Promise<TokenValidationResponse> {
  return request<TokenValidationResponse>(
    `/orders/by-token/${encodeURIComponent(token)}`,
  );
}

export function confirmOrder(
  token: string,
  items: ConfirmOrderItem[],
): Promise<void> {
  return request(`/orders/by-token/${encodeURIComponent(token)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ items }),
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
  category?: ProductCategory,
): Promise<ProductionTotalsResponse> {
  const params = new URLSearchParams();
  if (slotId) params.set('slotId', slotId);
  if (category) params.set('category', category);
  const qs = params.toString() ? `?${params.toString()}` : '';
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

export function getSlotExistence(
  slotId: string,
): Promise<SlotExistenceResponse> {
  return request<SlotExistenceResponse>(
    `/slots/${encodeURIComponent(slotId)}/existence`,
  );
}

export function setSlotExistence(
  slotId: string,
  items: ExistenceItem[],
): Promise<SlotExistenceResponse> {
  return request<SlotExistenceResponse>(
    `/slots/${encodeURIComponent(slotId)}/existence`,
    { method: 'PUT', body: JSON.stringify({ items }) },
  );
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>(`/products`);
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
