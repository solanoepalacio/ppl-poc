'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@pannico/shared';
import { ApiError, confirmOrder } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CatalogList } from './CatalogList';
import { BrandHeader } from './BrandHeader';
import { InvalidLinkNotice } from './InvalidLinkNotice';

type Outcome = 'open' | 'issued' | 'invalid';

const COPY = {
  title: 'Tu pedido',
  filterLabel: 'Filtrar productos',
  filterPlaceholder: 'Filtrá por nombre…',
  clearFilter: 'Limpiar',
  confirm: 'Confirmar pedido',
  busy: 'Enviando…',
  summaryTitle: 'Resumen de su pedido',
  showSummary: 'Ver Pedido',
  hideSummary: 'Ocultar Resumen',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

/**
 * Frictionless picklist form: no login, no prices, no payment. The whole
 * catalog is listed alphabetically on load and the customer types a quantity
 * on whichever products they want — a positive quantity is what puts a product
 * on the order. The filter above the list narrows what is shown without ever
 * touching the quantities already typed. Confirmation is immediate on success.
 *
 * Because the catalog is long and this is read on a phone, what was chosen at
 * the top is off-screen by the time you reach the bottom. The action bar
 * therefore carries an itemised summary as well as the count — collapsed by
 * default, since it is a check performed once rather than something to keep
 * open, and expanding it takes height from the catalog rather than from the
 * confirm button.
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
  const [showSummary, setShowSummary] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('open');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * The chosen products, in the same alphabetical order the catalog is listed
   * in, so the summary reads as a re-run of the list the customer just scrolled
   * rather than in the order they happened to tap.
   */
  const chosen = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((p) => ({ product: p, quantity: quantities[p.id] ?? 0 }))
        .filter((row) => row.quantity > 0),
    [catalog, quantities],
  );

  const items = useMemo(
    () =>
      chosen.map(({ product, quantity }) => ({
        productId: product.id,
        quantity,
      })),
    [chosen],
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

  const count =
    chosen.length === 1 ? '1 producto' : `${chosen.length} productos`;
  // Nothing chosen means nothing to summarise, so the control would open an
  // empty panel; the count already says zero.
  const summaryOpen = showSummary && chosen.length > 0;

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
        {summaryOpen && (
          <section className="order-summary" id="order-summary">
            <h2 className="order-summary-title">{COPY.summaryTitle}</h2>
            <ul className="order-summary-list">
              {chosen.map(({ product, quantity }) => (
                <li className="order-summary-row" key={product.id}>
                  {product.name}{' '}
                  <span className="order-summary-qty">x {quantity}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="summary-toggle"
              aria-expanded
              aria-controls="order-summary"
              onClick={() => setShowSummary(false)}
            >
              {COPY.hideSummary}
            </button>
          </section>
        )}

        <div className="action-bar-head">
          <p className="summary" aria-live="polite">
            {count}
          </p>
          {chosen.length > 0 && !summaryOpen && (
            <button
              type="button"
              className="summary-toggle"
              aria-expanded={false}
              aria-controls="order-summary"
              onClick={() => setShowSummary(true)}
            >
              {COPY.showSummary}
            </button>
          )}
        </div>

        <button
          className="btn-primary"
          disabled={busy || items.length === 0}
          onClick={submit}
        >
          {busy ? COPY.busy : COPY.confirm}
        </button>
      </div>
    </div>
  );
}
