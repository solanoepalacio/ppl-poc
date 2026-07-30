'use client';

import { useState } from 'react';
import type { Product, SlotViewOrder } from '@pannico/shared';
import { OrderActions } from './OrderActions';

/**
 * The orders in the selected bloque as an expandable table: one row per order
 * with client, date, and total item quantity. Clicking a row toggles a detail
 * band (inserted between it and the next row) listing the order's items and the
 * per-order edit/delete actions. Multiple rows may be open at once; expand state
 * is local (resets on navigation), while the order data is server-rendered.
 */
export function OrdersTable({
  orders,
  products,
}: {
  orders: SlotViewOrder[];
  products: Product[];
}) {
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="otable" role="table">
      <div className="otable-head" role="row">
        <div />
        <div>Cliente</div>
        <div>Fecha</div>
        <div className="col-right">Total items</div>
        <div />
      </div>

      {orders.length === 0 && (
        <div className="otable-empty muted">
          No hay pedidos en este bloque.
        </div>
      )}

      {orders.map((order) => {
        const isOpen = expanded.has(order.id);
        const total = order.items.reduce((sum, it) => sum + it.quantity, 0);
        return (
          <div className="otable-group" key={order.id}>
            <button
              type="button"
              className={isOpen ? 'otable-row expanded' : 'otable-row'}
              aria-expanded={isOpen}
              onClick={() => toggle(order.id)}
            >
              <span className="otable-dot-cell">
                <span className="otable-dot" />
              </span>
              <span className="otable-client">{order.clientName}</span>
              <span className="otable-date">
                {new Date(order.createdAt).toLocaleString()}
              </span>
              <span className="otable-total-cell">
                <span className="otable-total">{total}</span>
              </span>
              <span className="otable-chev-cell">
                <span className="otable-chev">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="otable-detail">
                {order.items.length > 0 ? (
                  <div className="otable-items">
                    {order.items.map((item) => (
                      <div className="otable-item" key={item.id}>
                        <span className="otable-item-name">
                          {productName.get(item.productId) ?? item.productId}
                        </span>
                        <span className="otable-item-qty">
                          × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Sin artículos.</p>
                )}
                <div className="otable-detail-actions">
                  <OrderActions
                    orderId={order.id}
                    items={order.items}
                    products={products}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
