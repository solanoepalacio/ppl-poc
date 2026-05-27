'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@pannico/shared';
import { confirmOrder, continueOnWhatsapp } from '@/lib/api';

type Outcome = 'open' | 'issued' | 'denied';

/**
 * Frictionless picklist form: no login, no prices, no payment. The customer
 * picks catalog products with quantities and submits, or chooses the WhatsApp
 * fallback. Confirmation is immediate on success.
 */
export function OrderForm({
  token,
  catalog,
}: {
  token: string;
  catalog: Product[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<Outcome>('open');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [quantities],
  );

  function setQty(productId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await confirmOrder(token, items);
      setOutcome('issued');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function whatsapp() {
    setError(null);
    setBusy(true);
    try {
      await continueOnWhatsapp(token);
      setOutcome('denied');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (outcome === 'issued') {
    return (
      <section className="card">
        <h1>Order received ✅</h1>
        <p className="muted">
          Thanks! Your order has been sent to the bakery. No further steps
          needed.
        </p>
      </section>
    );
  }

  if (outcome === 'denied') {
    return (
      <section className="card">
        <h1>Continue on WhatsApp 💬</h1>
        <p className="muted">
          No problem — please continue your order over WhatsApp with the bakery.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Place your order</h1>
      <p className="muted">Choose what you’d like and the quantity.</p>

      <div className="card">
        {catalog.map((product) => (
          <div className="row" key={product.id}>
            <span>{product.name}</span>
            <input
              className="qty"
              type="number"
              min={0}
              inputMode="numeric"
              aria-label={`Quantity for ${product.name}`}
              value={quantities[product.id] ?? 0}
              onChange={(e) => setQty(product.id, Number(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          className="btn-primary"
          disabled={busy || items.length === 0}
          onClick={submit}
        >
          {busy ? 'Submitting…' : 'Confirm order'}
        </button>
        <button className="btn-secondary" disabled={busy} onClick={whatsapp}>
          Continue on WhatsApp
        </button>
      </div>
      {items.length === 0 && (
        <p className="muted">Add at least one item to confirm.</p>
      )}
    </section>
  );
}
