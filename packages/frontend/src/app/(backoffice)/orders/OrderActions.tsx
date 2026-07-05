'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderItem, Product } from '@pannico/shared';
import { deleteOrder, replaceOrderItems } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { ItemQuantityFields, itemsFromQuantities } from './ItemQuantityFields';
import { Modal } from './Modal';

/**
 * Per-order back-office controls: edit the order's item list (replace-all in a
 * modal, prefilled from current items) and delete the order. Both confirm
 * destructive actions and refresh the server-rendered list on success.
 */
export function OrderActions({
  orderId,
  items,
  products,
}: {
  orderId: string;
  items: OrderItem[];
  products: Product[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.productId, i.quantity])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  function startEditing() {
    // Reset to the order's current items each time we open the editor.
    setQuantities(Object.fromEntries(items.map((i) => [i.productId, i.quantity])));
    setError(null);
    setEditing(true);
  }

  async function save() {
    const next = itemsFromQuantities(quantities);
    if (
      next.length === 0 &&
      !window.confirm('¿Guardar sin artículos? Esto borra los artículos de la orden.')
    ) {
      return;
    }
    setError(null);
    try {
      await replaceOrderItems(orderId, next);
      trackEvent('order_items_edited', {
        itemCount: next.length,
        totalQuantity: next.reduce((sum, i) => sum + i.quantity, 0),
      });
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los artículos.');
    }
  }

  async function remove() {
    if (!window.confirm('¿Eliminar esta orden? No se puede deshacer.')) {
      return;
    }
    setError(null);
    try {
      await deleteOrder(orderId);
      trackEvent('order_deleted');
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la orden.');
    }
  }

  return (
    <>
      <button
        className="btn-row-edit"
        onClick={startEditing}
        disabled={pending}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Editar artículos
      </button>
      <button
        className="btn-row-delete"
        onClick={() => void remove()}
        disabled={pending}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
        Eliminar
      </button>
      {error && !editing && <span className="error"> · {error}</span>}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar artículos"
        footer={
          <>
            <button
              className="btn-modal-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              className="btn-modal-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Guardar artículos
            </button>
          </>
        }
      >
        <ItemQuantityFields
          products={products}
          quantities={quantities}
          onChange={setQuantity}
          disabled={pending}
          unitLabel="cant."
        />
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
