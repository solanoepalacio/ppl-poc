'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ExistenceItem, Product } from '@pannico/shared';
import { setSlotExistence } from '@/lib/api';
import {
  ItemQuantityFields,
  itemsFromQuantities,
} from '../orders/ItemQuantityFields';
import { Modal } from '../orders/Modal';

/**
 * Open-bloque control to record existencia (stock already on hand), which the
 * production views subtract from their totals. Edits the whole per-product map
 * in a modal (replace-all, prefilled from current existence) and refreshes the
 * server-rendered list on success. Only rendered for the open bloque.
 */
export function ExistenceEditor({
  slotId,
  products,
  current,
}: {
  slotId: string;
  products: Product[];
  current: ExistenceItem[];
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
      <div className="row row--no-divider">
        <button
          className="btn-secondary"
          onClick={startEditing}
          disabled={pending}
        >
          Editar existencias
        </button>
        {error && !editing && <span className="error"> · {error}</span>}
      </div>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Existencias del bloque"
        bodyClassName="modal-body--scroll"
        footer={
          <>
            <button
              className="btn-primary"
              onClick={() => void save()}
              disabled={pending}
            >
              Guardar existencias
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Cancelar
            </button>
          </>
        }
      >
        <p className="muted">
          Lo que ya hay en existencia se descuenta de los totales de producción.
        </p>
        <ItemQuantityFields
          products={products}
          quantities={quantities}
          onChange={setQuantity}
          disabled={pending}
        />
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
