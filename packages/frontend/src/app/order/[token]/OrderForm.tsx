'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  /** Carries the seconds left, so the pause reads as a wait and not as a dead control. */
  review: (seconds: number) => `Revisar pedido...${seconds}`,
  reviewNotice: 'Por favor revise su pedido antes de confirmarlo',
  busy: 'Enviando…',
  summaryTitle: 'Resumen de su pedido',
  showSummary: 'Ver Pedido',
  hideSummary: 'Ocultar Resumen',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

/**
 * How long the confirm button stays out of reach once the review is raised. Long
 * enough that the screen cannot be dismissed by a second reflexive tap on a
 * control the finger is already over, short enough not to read as a hang — and
 * counted down on the button itself so the wait is legible rather than inferred.
 */
const REVIEW_PAUSE_SECONDS = 5;

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
 *
 * That check is not optional. The first confirm does not submit: it puts the
 * summary on screen with a notice to read it and holds the button for
 * `REVIEW_PAUSE_MS`, after which the button returns and submits as normal. Once
 * per visit — the pause is a speed bump before the first submission, not a
 * confirmation dialog.
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
   * Seconds left on the review pause, and the whole of the gate's state:
   * `null` means the review has not been raised, a positive number means the
   * pause is running and is what the button counts down, and zero means it has
   * elapsed and confirm submits. One value rather than a pair of booleans, so
   * "counting down" and "already reviewed" cannot contradict each other.
   */
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const reviewing = secondsLeft !== null && secondsLeft > 0;
  const reviewed = secondsLeft === 0;
  /**
   * Whether the filter has already been reported this visit. The event answers
   * "do customers reach for the filter at all", which one mark per visit
   * answers and one per keystroke only inflates.
   */
  const filterReported = useRef(false);

  // One tick per render while the count is running. Returning the clear covers
  // unmount as well, so a customer who closes the page mid-pause cannot leave a
  // timer to fire on a component that is gone.
  useEffect(() => {
    if (secondsLeft === null || secondsLeft === 0) return;
    const t = setTimeout(
      () => setSecondsLeft((s) => (s === null ? null : s - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [secondsLeft]);

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

  /**
   * Raises the review: the summary goes on screen — expanded if it was closed,
   * left alone if it was already open — and the button steps back for the length
   * of the pause. Nothing is submitted.
   */
  function startReview() {
    setError(null);
    // Against `order_confirmed` this is the gate's own success measure: every
    // order passes through here first, so the difference between the two counts
    // is exactly the customers who saw their summary and did not go on to
    // submit — which is the behaviour the pause was added to produce.
    trackEvent('order_review_raised', {
      itemCount: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      // The summary was already open, so the gate only added the pause.
      summaryWasOpen: showSummary,
    });
    setShowSummary(true);
    setSecondsLeft(REVIEW_PAUSE_SECONDS);
  }

  /** Opening and closing both report, so the two are comparable. */
  function toggleSummary(open: boolean) {
    trackEvent('order_summary_toggled', { open, itemCount: chosen.length });
    setShowSummary(open);
  }

  function confirmPressed() {
    if (!reviewed) {
      startReview();
      return;
    }
    void submit();
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
  // Stays up once raised, so it is still on screen for the confirm it is warning
  // about — not only during the pause.
  const showNotice = secondsLeft !== null;

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
            {/* Inside the panel on purpose: it makes "the summary is already
                open, so only the notice appears" fall out of the markup instead
                of needing a second code path, and collapsing the summary takes
                the notice with it — it is about the list it sits on. */}
            {showNotice && (
              <p className="order-review-notice" role="alert">
                {COPY.reviewNotice}
              </p>
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
          disabled={busy || items.length === 0 || reviewing}
          onClick={confirmPressed}
        >
          {busy
            ? COPY.busy
            : reviewing
              ? COPY.review(secondsLeft)
              : COPY.confirm}
        </button>
      </div>
    </div>
  );
}
