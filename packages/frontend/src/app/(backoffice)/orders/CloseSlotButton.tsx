'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotShortfallItem } from '@pannico/shared';
import { closeCurrentSlot, getCloseSlotPreview } from '@/lib/api';
import { Modal } from './Modal';

/**
 * Closes the current open bloque, which atomically opens a fresh one and carries
 * each product's stock actual forward as the new bloque's stock inicial.
 *
 * A stock actual below zero cannot carry — a stock inicial is a counted quantity
 * and never negative — so closing discards it. That is a real loss, so the button
 * asks the backend first and, when anything is short, shows what is about to be
 * dropped and makes the manager choose. With nothing short it keeps the plain
 * confirm it always had.
 *
 * Grayed out and unclickable via `disabled` when the selected bloque is not the
 * open one.
 */
export function CloseSlotButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [shortfalls, setShortfalls] = useState<SlotShortfallItem[] | null>(null);

  async function close() {
    setError(false);
    setBusy(true);
    try {
      await closeCurrentSlot();
      setShortfalls(null);
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError(false);
    setBusy(true);
    let short: SlotShortfallItem[] = [];
    try {
      short = (await getCloseSlotPreview()).shortfalls;
    } catch {
      setError(true);
      setBusy(false);
      return;
    }
    setBusy(false);

    if (short.length > 0) {
      // Hand the decision to the manager rather than dropping the shortfall
      // behind a generic confirm.
      setShortfalls(short);
      return;
    }
    if (
      !window.confirm(
        'Cerrar el bloque actual y abrir uno nuevo. Las órdenes nuevas irán al nuevo bloque y el stock actual pasará a ser el inicial. ¿Continuar?',
      )
    ) {
      return;
    }
    await close();
  }

  return (
    <>
      <button
        type="button"
        className="btn-toolbar-danger"
        onClick={() => void start()}
        disabled={pending || busy || disabled}
      >
        Cerrar bloque
      </button>
      {error && <span className="bo-toolbar-note"> · falló</span>}

      <Modal
        open={shortfalls !== null}
        onClose={() => setShortfalls(null)}
        title="Hay productos con faltante"
        footer={
          <>
            <button
              className="btn-modal-secondary"
              onClick={() => setShortfalls(null)}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              className="btn-modal-primary"
              onClick={() => void close()}
              disabled={busy}
            >
              Cerrar igual
            </button>
          </>
        }
      >
        <div className="close-warning">
          <p className="muted">
            Estos productos tienen stock actual negativo: se pidió más de lo que
            hay. Al cerrar, ese faltante <strong>se descarta</strong> — no pasa
            como stock inicial al bloque nuevo, porque el stock inicial no puede
            ser negativo.
          </p>
          <ul className="close-warning-list">
            {(shortfalls ?? []).map((s) => (
              <li className="close-warning-row" key={s.productId}>
                <span>{s.name}</span>
                <span className="close-warning-qty">−{s.shortfall}</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}
