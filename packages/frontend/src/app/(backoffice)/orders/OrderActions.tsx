'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderItem, Product } from '@pannico/shared';
import { deleteOrder, replaceOrderItems } from '@/lib/api';
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
      !window.confirm("Save with no items? This clears the order's items.")
    ) {
      return;
    }
    setError(null);
    try {
      await replaceOrderItems(orderId, next);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save items.');
    }
  }

  async function remove() {
    if (!window.confirm('Delete this order? This cannot be undone.')) {
      return;
    }
    setError(null);
    try {
      await deleteOrder(orderId);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete order.');
    }
  }

  return (
    <>
      <div className="row">
        <button
          className="btn-secondary"
          onClick={startEditing}
          disabled={pending}
        >
          Edit items
        </button>
        <button
          className="btn-secondary"
          onClick={() => void remove()}
          disabled={pending}
        >
          Delete
        </button>
        {error && !editing && <span className="error"> · {error}</span>}
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit items"
        footer={
          <>
            <button
              className="btn-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Save items
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancel
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
