'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_AREA_CODE,
  composePhoneE164,
  isValidPhoneEntry,
  type Product,
} from '@pannico/shared';
import { createOrder } from '@/lib/api';
import { PhoneField } from './PhoneField';
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
  const [areaCode, setAreaCode] = useState(DEFAULT_AREA_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const valid = isValidPhoneEntry(areaCode, localNumber);

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    try {
      await createOrder({
        phone: composePhoneE164(areaCode, localNumber),
        items: itemsFromQuantities(quantities),
        message,
      });
      setAreaCode(DEFAULT_AREA_CODE);
      setLocalNumber('');
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
      <PhoneField
        id="direct-order-phone"
        areaCode={areaCode}
        localNumber={localNumber}
        onAreaCodeChange={setAreaCode}
        onLocalNumberChange={setLocalNumber}
        disabled={pending}
      />
      {localNumber.length > 0 && !valid && (
        <p className="error">That phone number looks incomplete.</p>
      )}
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
      <button className="btn-primary" disabled={pending || !valid}>
        {pending ? 'Creating…' : 'Create order'}
      </button>
    </form>
  );
}
