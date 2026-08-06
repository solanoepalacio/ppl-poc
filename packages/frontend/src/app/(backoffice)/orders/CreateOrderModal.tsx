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
 * pinned above and the list gets everything below it. Issuing a shareable
 * customer link lives in its own toolbar trigger ("Generar link"), not here.
 *
 * No field for the order's originating message: `POST /orders` still accepts one
 * and stores it, but nothing in the back office ever read it back, so asking the
 * manager to retype the customer's text cost dialog height for nothing. Its
 * consumer is automated intake, which has the customer's own words to hand.
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

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid = clientId !== null;

  function reset() {
    setClientId(null);
    setQuantities({});
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
    // Zero drops the key rather than storing it: the map's key order is the
    // entry order the list displays, and a kept key would pin a re-added
    // product to its old position instead of appending it as a new entry.
    setQuantities((q) => {
      if (quantity > 0) return { ...q, [productId]: quantity };
      const { [productId]: _dropped, ...rest } = q;
      return rest;
    });
  }

  async function submitContent() {
    setError(null);
    try {
      const orderItems = itemsFromQuantities(quantities);
      await createOrder({
        clientId: clientId!,
        items: orderItems,
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
        className="btn-toolbar-ghost"
        onClick={openModal}
        disabled={disabled}
      >
        Agregar
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
