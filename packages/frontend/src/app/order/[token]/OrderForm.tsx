'use client';

import { useMemo, useRef, useState } from 'react';
import type { Product } from '@pannico/shared';
import { ApiError, confirmOrder } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { CatalogList } from './CatalogList';
import { BrandHeader } from './BrandHeader';
import { InvalidLinkNotice } from './InvalidLinkNotice';

type Outcome = 'open' | 'issued' | 'invalid';

const COPY = {
  title: 'Tu pedido',
  unitNotice: 'IMPORTANTE: LOS PEDIDOS SE TOMAN POR UNIDAD, NO POR PAQUETE',
  filterLabel: 'Filtrar productos',
  filterPlaceholder: 'Filtrá por nombre…',
  clearFilter: 'Limpiar',
  confirm: 'Confirmar pedido',
  /** Stays on the summary, which is now the only place a review happens — by
   * choice rather than by compulsion. */
  reviewNotice: 'POR FAVOR REVISE SU PEDIDO ANTES DE CONFIRMARLO',
  busy: 'Enviando…',
  summaryTitle: 'Resumen de su pedido',
  showSummary: 'Ver Pedido',
  hideSummary: 'Ocultar Resumen',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

/**
 * How many extra attempts a submission gets before the customer is told
 * anything, and how long to wait between them.
 *
 * Bounded and short: this exists to survive a phone changing cell on the way to
 * the counter, not to grind against an outage. Past it the customer gets a
 * retryable error, which is the honest outcome and one they can act on.
 */
const RETRY_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = [400, 1200];

/**
 * Frictionless picklist form: no login, no prices, no payment. The whole
 * catalog is listed alphabetically on load and the customer types a quantity
 * on whichever products they want — a positive quantity is what puts a product
 * on the order. The filter above the list narrows what is shown without ever
 * touching the quantities already typed.
 *
 * Because the catalog is long and this is read on a phone, what was chosen at
 * the top is off-screen by the time you reach the bottom. The action bar
 * therefore carries an itemised summary as well as the count — collapsed by
 * default, since it is a check performed once rather than something to keep
 * open, and expanding it takes height from the catalog rather than from the
 * confirm button.
 *
 * **Confirming takes one tap.** The summary is there, with its notice, for a
 * customer who wants to check before confirming; what is gone is the
 * requirement to look. The gate was designed for somebody arriving at the form
 * unprompted, where a mistaken order was expensive to catch — but it is paid on
 * a phone, inside a chat, by somebody who has already decided, and now the order
 * comes back to them over WhatsApp anyway.
 *
 * On success the page renders its confirmation and then tries to close itself,
 * so a customer who arrived from a chat is returned to it.
 */
export function OrderForm({
  token,
  catalog,
}: {
  token: string;
  catalog: Product[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  /**
   * The products on the order, earliest first. Tracked as it happens rather than
   * derived: a `Record` has no order to read back, and even keeping insertion
   * order would not survive a product being cleared and typed again — which is a
   * new entry and belongs at the end.
   */
  const [entryOrder, setEntryOrder] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('open');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Whether the filter has already been reported this visit. The event answers
   * "do customers reach for the filter at all", which one mark per visit
   * answers and one per keystroke only inflates.
   */
  const filterReported = useRef(false);

  const byId = useMemo(
    () => new Map(catalog.map((p) => [p.id, p])),
    [catalog],
  );

  /**
   * The chosen products in the order the customer entered them, so the summary
   * reads back as the sequence they just performed rather than re-shuffling it.
   * The `quantity > 0` filter stays as a guard: the order and the quantities are
   * two pieces of state, and the render should not assume they agree.
   */
  const chosen = useMemo(
    () =>
      entryOrder
        .map((id) => ({ product: byId.get(id), quantity: quantities[id] ?? 0 }))
        .filter(
          (row): row is { product: Product; quantity: number } =>
            row.product !== undefined && row.quantity > 0,
        ),
    [entryOrder, quantities, byId],
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
    const quantity = Math.max(0, value);
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
    setEntryOrder((prev) => {
      // Dropping to zero takes the product off the order, so it leaves the list;
      // typing a quantity on a product that is not on it appends. A product
      // already on the order keeps its place however often its quantity changes.
      if (quantity === 0) return prev.filter((id) => id !== productId);
      return prev.includes(productId) ? prev : [...prev, productId];
    });
  }

  /**
   * A 404 on a token endpoint means the link is no longer valid — e.g. the
   * bakery closed the bloque while the customer was filling out the form. Switch
   * to the invalid-link view instead of an inline error the customer can't act
   * on. Any other failure stays an inline, retryable error.
   */
  function handleActionError(e: unknown) {
    if (e instanceof ApiError && e.status === 404) {
      // Not reported here: the invalid-link view bundles TrackInvalidLink, so
      // switching to it emits `order_link_invalid` on its own.
      setOutcome('invalid');
      return;
    }
    // A customer who cannot submit has no way to tell the bakery so, which makes
    // this the one failure that is otherwise completely silent. `status` is 0
    // when the request never reached the server at all.
    trackEvent('order_confirm_failed', {
      reason: e instanceof ApiError ? 'server' : 'network',
      status: e instanceof ApiError ? e.status : 0,
      itemCount: items.length,
    });
    setError(e instanceof Error ? e.message : COPY.genericError);
  }

  /**
   * Submits, retrying only what repetition can fix.
   *
   * A request that never reached the server, or one the server answered with a
   * 5xx, is worth trying again — the customer is on a phone and the failure is
   * as likely to be the walk to the counter as anything on our side. A 4xx will
   * fail identically however often it is sent, so it is surfaced immediately.
   *
   * **A 404 on a retry counts as success**, and only on a retry. The link is
   * single-use and bound to one order, so once an attempt has been made that
   * rejection is the signature of a submission that *worked* and whose response
   * was lost — telling that customer their link is dead would invite them to
   * order all over again. A 404 on the first attempt is what it says it is: the
   * link was already spent, or its bloque closed while they were filling in the
   * form.
   */
  async function submit() {
    setError(null);
    setBusy(true);
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          await confirmOrder(token, items);
          break;
        } catch (e) {
          if (attempt > 0 && e instanceof ApiError && e.status === 404) break;
          // Anything that is not an ApiError never got an answer at all — a
          // dropped request, a dead radio — which is the case retrying exists
          // for. With an answer in hand, only a 5xx is worth repeating.
          const retryable = !(e instanceof ApiError) || e.status >= 500;
          if (!retryable || attempt >= RETRY_ATTEMPTS) throw e;
          await delay(RETRY_BACKOFF_MS[attempt] ?? 1200);
        }
      }
      trackEvent('order_confirmed', {
        itemCount: items.length,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      });
      // The success state first, the close attempt after. The order matters:
      // `window.close()` is only honoured for a script-opened window, and
      // WhatsApp's in-app browser is not one — so for exactly the customers this
      // is aimed at, the screen *is* the outcome and the close is the bonus.
      setOutcome('issued');
      closeWindow();
    } catch (e) {
      handleActionError(e);
    } finally {
      setBusy(false);
    }
  }

  /** Opening and closing both report, so the two are comparable. */
  function toggleSummary(open: boolean) {
    trackEvent('order_summary_toggled', { open, itemCount: chosen.length });
    setShowSummary(open);
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
  // Part of the summary, not something the confirm raises: it has to be read
  // while the order is still being built, not once the customer has decided.
  const showNotice = summaryOpen;

  return (
    <div className="customer-shell">
      <BrandHeader />
      <h1>{COPY.title}</h1>
      {/* Here rather than in BrandHeader, which the success and invalid-link
          screens also render — neither has a quantity left to misread. */}
      <p className="unit-notice">{COPY.unitNotice}</p>

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
            onChange={(e) => {
              if (!filterReported.current && e.target.value !== '') {
                filterReported.current = true;
                trackEvent('order_filter_used');
              }
              setFilter(e.target.value);
            }}
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
            {/* No role="alert": it is present from the moment the summary opens,
                and an alert that was always there is not an alert — it would just
                be announced on load. The text carries it. */}
            {showNotice && (
              <p className="order-review-notice">{COPY.reviewNotice}</p>
            )}
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
              onClick={() => toggleSummary(false)}
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
              onClick={() => toggleSummary(true)}
            >
              {COPY.showSummary}
            </button>
          )}
        </div>

        <button
          className="btn-primary"
          disabled={busy || items.length === 0}
          onClick={() => void submit()}
        >
          {busy ? COPY.busy : COPY.confirm}
        </button>
      </div>
    </div>
  );
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Asks the browser to close the window, and does not care whether it agrees.
 *
 * Closing is only permitted for a window the page itself opened, which the
 * in-app browser a customer arrives in from a chat is not. A refusal is
 * therefore the ordinary outcome rather than an error, and there is nothing to
 * report to a customer whose order has already gone through.
 */
function closeWindow() {
  try {
    window.close();
  } catch {
    /* refused; the success state is already on screen */
  }
}
