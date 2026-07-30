'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@pannico/shared';
import { ApiError, confirmOrder, continueOnWhatsapp } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CatalogList } from './CatalogList';
import { BrandHeader } from './BrandHeader';
import { InvalidLinkNotice } from './InvalidLinkNotice';

type Outcome = 'open' | 'issued' | 'denied' | 'invalid';

const COPY = {
  title: 'Tu pedido',
  filterLabel: 'Filtrar productos',
  filterPlaceholder: 'Filtrá por nombre…',
  clearFilter: 'Limpiar',
  confirm: 'Confirmar pedido',
  busy: 'Enviando…',
  whatsapp: 'Seguir por WhatsApp',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

/**
 * Frictionless picklist form: no login, no prices, no payment. The whole
 * catalog is listed alphabetically on load and the customer types a quantity
 * on whichever products they want — a positive quantity is what puts a product
 * on the order. The filter above the list narrows what is shown without ever
 * touching the quantities already typed. Confirmation is immediate on success.
 */
export function OrderForm({
  token,
  catalog,
}: {
  token: string;
  catalog: Product[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
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

  /**
   * A 404 on a token endpoint means the link is no longer valid — e.g. the
   * bakery closed the bloque while the customer was filling out the form. Switch
   * to the invalid-link view instead of an inline error the customer can't act
   * on. Any other failure stays an inline, retryable error.
   */
  function handleActionError(e: unknown) {
    if (e instanceof ApiError && e.status === 404) {
      setOutcome('invalid');
      return;
    }
    setError(e instanceof Error ? e.message : COPY.genericError);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await confirmOrder(token, items);
      trackEvent('order_confirmed', {
        itemCount: items.length,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      });
      setOutcome('issued');
    } catch (e) {
      handleActionError(e);
    } finally {
      setBusy(false);
    }
  }

  async function whatsapp() {
    setError(null);
    setBusy(true);
    try {
      await continueOnWhatsapp(token);
      trackEvent('whatsapp_fallback_selected');
      setOutcome('denied');
    } catch (e) {
      handleActionError(e);
    } finally {
      setBusy(false);
    }
  }

  if (outcome === 'invalid') {
    return <InvalidLinkNotice />;
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
    <div className="customer-shell">
      <BrandHeader />
      <h1>{COPY.title}</h1>

      <div className="order-search">
        <div className="filter-row">
          <input
            id="order-filter"
            type="text"
            className="filter-input"
            aria-label={COPY.filterLabel}
            placeholder={COPY.filterPlaceholder}
            autoComplete="off"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            type="button"
            className="filter-clear"
            disabled={filter === ''}
            onClick={() => setFilter('')}
          >
            {COPY.clearFilter}
          </button>
        </div>
      </div>

      <div className="customer-list">
        <CatalogList
          products={catalog}
          quantities={quantities}
          onChange={setQty}
          filter={filter}
          disabled={busy}
        />
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
      </div>
    </div>
  );
}
