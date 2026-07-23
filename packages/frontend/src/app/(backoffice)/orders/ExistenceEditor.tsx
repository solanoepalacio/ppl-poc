'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ExistenceItem, Product } from '@pannico/shared';
import { setSlotExistence } from '@/lib/api';
import { ProductPicker, itemsFromQuantities } from './ProductPicker';
import { Modal } from './Modal';

/**
 * Open-bloque control to record existencia (stock already on hand), which the
 * production views subtract from their totals. Edits the whole per-product map
 * in a modal (replace-all, prefilled from current existence) and refreshes the
 * server-rendered list on success. Existencia is only editable on the open
 * bloque, so the trigger is grayed out and unclickable when `disabled`.
 */
export function ExistenceEditor({
  slotId,
  products,
  current,
  disabled,
}: {
  slotId: string;
  products: Product[];
  current: ExistenceItem[];
  /** Grayed-out and unclickable when the selected bloque is not the open one. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(current.map((i) => [i.productId, i.quantity])),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  function startEditing() {
    // Reset to the bloque's current existence each time we open the editor.
    setQuantities(
      Object.fromEntries(current.map((i) => [i.productId, i.quantity])),
    );
    setError(null);
    setEditing(true);
  }

  async function save() {
    setError(null);
    try {
      await setSlotExistence(slotId, itemsFromQuantities(quantities));
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No se pudo guardar la existencia.',
      );
    }
  }

  return (
    <>
      <button
        className="btn-toolbar-ghost"
        onClick={startEditing}
        disabled={pending || disabled}
      >
        Stock
      </button>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar stock"
        aboveBody={
          <>
            <p className="muted modal-above-hint">
              Lo que ya hay en existencia se descuenta de los totales de
              producción.
            </p>
            <span className="modal-section-label">Productos en stock</span>
          </>
        }
        footer={
          <>
            <button
              className="btn-modal-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              className="btn-modal-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Guardar existencia
            </button>
          </>
        }
      >
        <ProductPicker
          products={products}
          quantities={quantities}
          onChange={setQuantity}
          disabled={pending}
          searchId="stock-product"
        />
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
