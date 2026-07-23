'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type Client, type Product } from '@pannico/shared';
import { createOrder } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { Modal } from './Modal';
import { ClientCombobox } from './ClientCombobox';
import { ProductPicker, itemsFromQuantities } from './ProductPicker';

/**
 * Client-first order creation, launched as a modal from the bloque toolbar. The
 * manager selects a client (filtering by name) and records the order's contents
 * directly ("Agregar pedido"). Products are added one at a time from a search
 * box, so the body lists only what is on the order; the client picker stays
 * pinned above and the optional message pinned below. Issuing a shareable
 * customer link lives in its own toolbar trigger ("Generar link"), not here.
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

  const [clientId, setClientId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid = clientId !== null;

  function reset() {
    setClientId(null);
    setQuantities({});
    setMessage('');
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

  const footer = (
    <>
      <button className="btn-modal-secondary" onClick={close}>
        Cancelar
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
          <>
            <ClientCombobox
              key={open ? 'open' : 'closed'}
              id="create-order-client"
              clients={clients}
              onSelect={setClientId}
              disabled={pending}
              autoFocus
            />
            <span className="modal-section-label">Productos en el pedido</span>
          </>
        }
        belowBody={
          <div className="modal-message">
            <label htmlFor="create-order-message">
              Mensaje del pedido (opcional)
            </label>
            <textarea
              id="create-order-message"
              rows={2}
              placeholder="Ingresa el mensaje que el usuario uso para hacerte el pedido. Sera usado para entrenar al agente que toma pedidos."
              value={message}
              disabled={pending}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        }
      >
        <ProductPicker
          products={products}
          quantities={quantities}
          onChange={setQuantity}
          disabled={pending}
          searchId="create-order-product"
        />

        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
