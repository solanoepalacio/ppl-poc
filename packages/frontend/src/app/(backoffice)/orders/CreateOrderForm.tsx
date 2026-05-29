'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@pannico/shared';
import { createOrder } from '@/lib/api';
import { ItemQuantityFields, itemsFromQuantities } from './ItemQuantityFields';
import { Modal } from './Modal';

/**
 * Back-office manual order entry: the manager records an order received by
 * phone, WhatsApp, or in person. Opens in a modal so the catalog stays easy to
 * scroll; on success it resets and refreshes the server-rendered day view.
 */
export function CreateOrderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  function close() {
    setPhone('');
    setQuantities({});
    setError(null);
    setOpen(false);
  }

  async function submit() {
    setError(null);
    try {
      await createOrder({ phone, items: itemsFromQuantities(quantities) });
      close();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order.');
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        + New order
      </button>
      <Modal
        open={open}
        onClose={close}
        title="New order"
        footer={
          <>
            <button
              className="btn-primary"
              onClick={() => void submit()}
              disabled={pending}
            >
              Create
            </button>
            <button
              className="btn-secondary"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </button>
          </>
        }
      >
        <p className="muted">
          Record an order received by phone, WhatsApp, or in person.
        </p>
        <div className="field">
          <label htmlFor="new-order-phone">Phone</label>
          <input
            id="new-order-phone"
            type="tel"
            placeholder="+5491122334455"
            value={phone}
            disabled={pending}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
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
