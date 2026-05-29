import type {
  ConfirmOrderItem,
  CreateLinkResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DayViewResponse,
  DeleteOrderResponse,
  OrderStatus,
  Product,
  ProductionTotalsResponse,
  ReplaceOrderItemsResponse,
  TokenValidationResponse,
  UpdateOrderStatusResponse,
} from '@pannico/shared';

/**
 * Backend API base URL. Configured via env so the frontend can point at any
 * backend instance (see .env.local / .env.example).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

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

export function createLink(phone: string): Promise<CreateLinkResponse> {
  return request<CreateLinkResponse>(`/links`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function getOrdersByDay(day?: string): Promise<DayViewResponse> {
  const qs = day ? `?day=${encodeURIComponent(day)}` : '';
  return request<DayViewResponse>(`/orders${qs}`);
}

export function getProductionTotals(
  day?: string,
): Promise<ProductionTotalsResponse> {
  const qs = day ? `?day=${encodeURIComponent(day)}` : '';
  return request<ProductionTotalsResponse>(`/orders/production${qs}`);
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
