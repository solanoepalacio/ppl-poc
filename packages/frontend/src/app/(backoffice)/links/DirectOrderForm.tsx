'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@pannico/shared';
import { createOrder } from '@/lib/api';
import {
  ItemQuantityFields,
  itemsFromQuantities,
} from '../orders/ItemQuantityFields';

/**
 * Direct order entry: the manager records an order received by phone, WhatsApp,
 * or in person by adding catalog items, with an optional free-text message to
 * capture the originating customer message (e.g. the pasted WhatsApp text). On
 * success it resets and refreshes the server-rendered day view.
 */
export function DirectOrderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    try {
      await createOrder({
        phone,
        items: itemsFromQuantities(quantities),
        message,
      });
      setPhone('');
      setQuantities({});
      setMessage('');
      setDone(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order.');
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <p className="muted">
        Record an order received by phone, WhatsApp, or in person.
      </p>
      <div className="field">
        <label htmlFor="direct-order-phone">Phone</label>
        <input
          id="direct-order-phone"
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
      <div className="field">
        <label htmlFor="direct-order-message">Message (optional)</label>
        <textarea
          id="direct-order-message"
          rows={6}
          placeholder="Paste the WhatsApp message that generated this order…"
          value={message}
          disabled={pending}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {done && <p className="muted">Order created.</p>}
      <button className="btn-primary" disabled={pending || !phone}>
        {pending ? 'Creating…' : 'Create order'}
      </button>
    </form>
  );
}
