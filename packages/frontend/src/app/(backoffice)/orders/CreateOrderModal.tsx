'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Client,
  type CreateLinkResponse,
  type Product,
} from '@pannico/shared';
import { createLink, createOrder } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { Modal } from './Modal';
import { ClientCombobox } from './ClientCombobox';
import { ProductCombobox } from './ProductCombobox';
import { SelectedItems } from './SelectedItems';
import { itemsFromQuantities } from './ItemQuantityFields';

/**
 * Client-first order creation, launched as a modal from the bloque toolbar. The
 * manager selects a client (filtering by name), then either records the order's
 * contents directly ("Agregar pedido") or issues a shareable tokenized link
 * ("Generar link") for the customer to fill in. Products are added one at a time
 * from a search box, so the body lists only what is on the order; the client
 * pickers stay pinned above and the optional message pinned below.
 */
export function CreateOrderModal({
  products,
  clients,
  disabled,
}: {
  products: Product[];
  clients: Client[];
  /** Grayed-out and unclickable when the selected bloque is not the open one. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'link'>('form');

  const [clientId, setClientId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  // The product most recently added, with a bump counter so re-adding the same
  // product still re-triggers the scroll-to + highlight in the added list.
  const [justAdded, setJustAdded] = useState<{ id: string; n: number } | null>(
    null,
  );

  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid = clientId !== null;

  function reset() {
    setStep('form');
    setClientId(null);
    setQuantities({});
    setMessage('');
    setJustAdded(null);
    setResult(null);
    setCopied(false);
    setBusy(false);
    setError(null);
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  function addProduct(productId: string) {
    setQuantities((q) => (q[productId] ? q : { ...q, [productId]: 1 }));
    setJustAdded((prev) => ({ id: productId, n: (prev?.n ?? 0) + 1 }));
  }

  function removeProduct(productId: string) {
    setQuantities((q) => {
      const next = { ...q };
      delete next[productId];
      return next;
    });
  }

  const addedIds = Object.keys(quantities).filter((id) => quantities[id] > 0);

  async function generateLink() {
    setError(null);
    setBusy(true);
    try {
      const res = await createLink(clientId!);
      trackEvent('order_link_generated');
      setResult(res);
      setStep('link');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    trackEvent('order_link_copied');
    setCopied(true);
  }

  async function submitContent() {
    setError(null);
    try {
      const orderItems = itemsFromQuantities(quantities);
      await createOrder({
        clientId: clientId!,
        items: orderItems,
        message,
      });
      trackEvent('order_created_direct', {
        itemCount: orderItems.length,
        totalQuantity: orderItems.reduce((sum, i) => sum + i.quantity, 0),
      });
      close();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la orden.');
    }
  }

  const footer =
    step === 'link' ? (
      <>
        <button className="btn-modal-secondary" onClick={() => void copy()}>
          {copied ? '¡Copiado!' : 'Copiar enlace'}
        </button>
        <button className="btn-modal-primary" onClick={close}>
          Listo
        </button>
      </>
    ) : (
      <>
        <button className="btn-modal-secondary" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn-modal-secondary"
          onClick={() => void generateLink()}
          disabled={!valid || busy}
        >
          {busy ? 'Generando…' : 'Generar link'}
        </button>
        <button
          className="btn-modal-primary"
          onClick={() => void submitContent()}
          disabled={!valid || pending}
        >
          {pending ? 'Creando…' : 'Agregar pedido'}
        </button>
      </>
    );

  return (
    <>
      <button
        type="button"
        className="btn-toolbar-primary"
        onClick={openModal}
        disabled={disabled}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Agregar pedido
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Agregar pedido"
        footer={footer}
        aboveBody={
          step === 'form' ? (
            <>
              <ClientCombobox
                key={open ? 'open' : 'closed'}
                id="create-order-client"
                clients={clients}
                onSelect={setClientId}
                disabled={busy || pending}
                autoFocus
              />
              <ProductCombobox
                id="create-order-product"
                products={products}
                addedIds={addedIds}
                onAdd={addProduct}
                disabled={pending}
              />
            </>
          ) : undefined
        }
        belowBody={
          step === 'form' ? (
            <div className="modal-message">
              <label htmlFor="create-order-message">
                Mensaje del pedido (opcional)
              </label>
              <textarea
                id="create-order-message"
                rows={2}
                placeholder="Ej. sin azúcar, retira a las 9hs…"
                value={message}
                disabled={pending}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          ) : undefined
        }
      >
        {step === 'link' && result && (
          <div className="card">
            <p className="muted">
              Compartí este enlace con el cliente por WhatsApp:
            </p>
            <p>
              <code>{result.url}</code>
            </p>
            <p className="muted">
              Para {result.clientName} · válido durante el bloque #
              {result.slotSeq}
            </p>
          </div>
        )}

        {step === 'form' && (
          <SelectedItems
            products={products}
            quantities={quantities}
            onChange={setQuantity}
            onRemove={removeProduct}
            disabled={pending}
            highlight={justAdded}
          />
        )}

        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
