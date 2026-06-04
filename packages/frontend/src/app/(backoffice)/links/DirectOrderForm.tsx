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
      setError(e instanceof Error ? e.message : 'No se pudo crear la orden.');
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <p className="muted">
        Registrá una orden recibida por teléfono, WhatsApp o en persona.
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
        <p className="error">Ese número de teléfono parece incompleto.</p>
      )}
      <ItemQuantityFields
        products={products}
        quantities={quantities}
        onChange={setQuantity}
        disabled={pending}
      />
      <div className="field">
        <label htmlFor="direct-order-message">Mensaje (opcional)</label>
        <textarea
          id="direct-order-message"
          rows={6}
          placeholder="Pegá el mensaje de WhatsApp que generó esta orden…"
          value={message}
          disabled={pending}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      {done && <p className="muted">Orden creada.</p>}
      <button className="btn-primary" disabled={pending || !valid}>
        {pending ? 'Creando…' : 'Crear orden'}
      </button>
    </form>
  );
}
