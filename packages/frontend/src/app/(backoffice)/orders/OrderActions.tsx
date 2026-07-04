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
      <div className="row row--no-divider">
        <button
          className="btn-secondary"
          onClick={startEditing}
          disabled={pending}
        >
          Editar artículos
        </button>
        <button
          className="btn-secondary"
          onClick={() => void remove()}
          disabled={pending}
        >
          Eliminar
        </button>
        {error && !editing && <span className="error"> · {error}</span>}
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar artículos"
        bodyClassName="modal-body--scroll"
        footer={
          <>
            <button
              className="btn-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Guardar artículos
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
          </>
        }
      >
        <ItemQuantityFields
          products={products}
          quantities={quantities}
          onChange={setQuantity}
          disabled={pending}
        />
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
