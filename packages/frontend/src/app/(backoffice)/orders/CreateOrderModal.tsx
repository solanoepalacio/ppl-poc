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
import { ItemQuantityFields, itemsFromQuantities } from './ItemQuantityFields';

/**
 * Client-first order creation, launched as a modal from the orders view. The
 * manager selects a client (filtering by name), then chooses a path: "Generar
 * link" issues a shareable tokenized link, while "Cargar contenido" reveals the
 * catalog so the order can be recorded directly. Both paths reuse the single
 * client selection; the items list stays hidden until content is loaded.
 */
export function CreateOrderModal({
  products,
  clients,
}: {
  products: Product[];
  clients: Client[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choose' | 'link' | 'content'>('choose');

  const [clientId, setClientId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid = clientId !== null;

  function reset() {
    setStep('choose');
    setClientId(null);
    setQuantities({});
    setMessage('');
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
        <button className="btn-primary" onClick={() => void copy()}>
          {copied ? '¡Copiado!' : 'Copiar enlace'}
        </button>
        <button className="btn-secondary" onClick={close}>
          Listo
        </button>
      </>
    ) : step === 'content' ? (
      <>
        <button
          className="btn-primary"
          onClick={() => void submitContent()}
          disabled={pending}
        >
          {pending ? 'Creando…' : 'Crear orden'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => setStep('choose')}
          disabled={pending}
        >
          Volver
        </button>
      </>
    ) : undefined;

  return (
    <>
      <button type="button" className="btn-primary" onClick={openModal}>
        Crear orden
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Crear orden"
        footer={footer}
        bodyClassName={step === 'content' ? 'modal-body--content' : undefined}
      >
        <ClientCombobox
          key={open ? 'open' : 'closed'}
          id="create-order-client"
          clients={clients}
          onSelect={setClientId}
          disabled={busy || pending || step === 'link'}
          autoFocus
        />

        {step === 'choose' && (
          <div className="row row--no-divider">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void generateLink()}
              disabled={!valid || busy}
            >
              {busy ? 'Generando…' : 'Generar link'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep('content')}
              disabled={!valid}
            >
              Cargar contenido
            </button>
          </div>
        )}

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

        {/*
          Content step: the client selector (above) stays fixed, the items list
          is the only scrollable region, and the message field below stays
          fixed. The modal-body--content class turns the body into a flex column
          so the items region can flex-grow and scroll on its own.
        */}
        {step === 'content' && (
          <div className="order-content__items">
            <ItemQuantityFields
              products={products}
              quantities={quantities}
              onChange={setQuantity}
              disabled={pending}
            />
          </div>
        )}

        {step === 'content' && (
          <div className="field order-content__message">
            <label htmlFor="create-order-message">Mensaje (opcional)</label>
            <textarea
              id="create-order-message"
              rows={6}
              placeholder="Pegá el mensaje de WhatsApp que generó esta orden…"
              value={message}
              disabled={pending}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
