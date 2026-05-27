'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@pannico/shared';
import { confirmOrder, continueOnWhatsapp } from '@/lib/api';
import { BrandHeader } from './BrandHeader';
import { QuantityStepper } from './QuantityStepper';

type Outcome = 'open' | 'issued' | 'denied';

const COPY = {
  title: 'Tu pedido',
  subtitle: 'Elegí lo que querés y la cantidad.',
  emptyHint: 'Agregá al menos un producto.',
  confirm: 'Confirmar pedido',
  busy: 'Enviando…',
  whatsapp: 'Seguir por WhatsApp',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

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
      setError(e instanceof Error ? e.message : COPY.genericError);
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
      setError(e instanceof Error ? e.message : COPY.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (outcome === 'issued') {
    return (
      <>
        <BrandHeader />
        <section className="card outcome">
          <span className="emoji" aria-hidden="true">
            ✅
          </span>
          <h1>¡Pedido recibido!</h1>
          <p>Gracias. Tu pedido fue enviado a la panadería.</p>
        </section>
      </>
    );
  }

  if (outcome === 'denied') {
    return (
      <>
        <BrandHeader />
        <section className="card outcome">
          <span className="emoji" aria-hidden="true">
            💬
          </span>
          <h1>Seguí por WhatsApp</h1>
          <p>
            Sin problema — continuá tu pedido por WhatsApp con la panadería.
          </p>
        </section>
      </>
    );
  }

  const summary =
    items.length === 1 ? '1 producto' : `${items.length} productos`;

  return (
    <>
      <BrandHeader />
      <section>
        <h1>{COPY.title}</h1>
        <p className="subtitle">{COPY.subtitle}</p>

        <div className="product-list">
          {catalog.map((product) => {
            const qty = quantities[product.id] ?? 0;
            return (
              <div
                className={`product-row${qty > 0 ? ' selected' : ''}`}
                key={product.id}
              >
                <span className="product-name">{product.name}</span>
                <QuantityStepper
                  productName={product.name}
                  value={qty}
                  onChange={(next) => setQty(product.id, next)}
                />
              </div>
            );
          })}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="action-bar">
          <p className="summary" aria-live="polite">
            {summary}
          </p>
          <button
            className="btn-primary"
            disabled={busy || items.length === 0}
            onClick={submit}
          >
            {busy ? COPY.busy : COPY.confirm}
          </button>
          <button className="btn-secondary" disabled={busy} onClick={whatsapp}>
            {COPY.whatsapp}
          </button>
          {items.length === 0 && <p className="muted">{COPY.emptyHint}</p>}
        </div>
      </section>
    </>
  );
}
