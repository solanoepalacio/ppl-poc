'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@pannico/shared';
import { ApiError, confirmOrder, continueOnWhatsapp } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { ProductCombobox } from '@/app/(backoffice)/orders/ProductCombobox';
import { SelectedItems } from '@/app/(backoffice)/orders/SelectedItems';
import { BrandHeader } from './BrandHeader';
import { InvalidLinkNotice } from './InvalidLinkNotice';

type Outcome = 'open' | 'issued' | 'denied' | 'invalid';

const COPY = {
  title: 'Tu pedido',
  subtitle: 'Buscá lo que querés, agregalo y elegí la cantidad.',
  empty: 'Todavía no agregaste productos. Buscá uno arriba para empezar.',
  emptyHint: 'Agregá al menos un producto.',
  confirm: 'Confirmar pedido',
  busy: 'Enviando…',
  whatsapp: 'Seguir por WhatsApp',
  genericError: 'Algo salió mal. Intentá de nuevo.',
};

/**
 * Frictionless picklist form: no login, no prices, no payment. The customer
 * searches the catalog, adds products one at a time, types each quantity, and
 * submits — or chooses the WhatsApp fallback. The same add-by-search UX as the
 * back-office order dialogs; only the products already added are shown.
 * Confirmation is immediate on success.
 */
export function OrderForm({
  token,
  catalog,
}: {
  token: string;
  catalog: Product[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState<{ id: string; n: number } | null>(
    null,
  );
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
  const addedIds = items.map((i) => i.productId);

  function setQty(productId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  function addProduct(productId: string) {
    setQuantities((prev) =>
      prev[productId] > 0 ? prev : { ...prev, [productId]: 1 },
    );
    setJustAdded((prev) => ({ id: productId, n: (prev?.n ?? 0) + 1 }));
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
    <>
      <BrandHeader />
      <section className="customer-order">
        <h1>{COPY.title}</h1>
        <p className="subtitle">{COPY.subtitle}</p>

        <div className="order-search">
          <ProductCombobox
            id="order-product"
            products={catalog}
            addedIds={addedIds}
            onAdd={addProduct}
          />
        </div>

        <SelectedItems
          products={catalog}
          quantities={quantities}
          onChange={setQty}
          onRemove={(id) => setQty(id, 0)}
          highlight={justAdded}
          emptyText={COPY.empty}
        />

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
