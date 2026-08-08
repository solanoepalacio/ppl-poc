'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SlotShortfallItem } from '@pannico/shared';
import { closeCurrentSlot, getCloseSlotPreview } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { Modal } from './Modal';

/**
 * Closes the current open bloque, which atomically opens a fresh one and carries
 * each product's stock actual forward as the new bloque's stock inicial.
 *
 * A bloque with any product in shortfall **cannot** be closed: the shortfall is
 * work the bakery owes, and closing would discard it. The button asks the backend
 * first and, when anything is short, shows what is blocking the close instead of
 * offering to proceed. With nothing short it keeps the plain confirm it always
 * had.
 *
 * The preview is the fast path, not the guard — the backend refuses either way,
 * which is what covers an order landing between the preview and the close.
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
      // No shortfall properties on this one: a close that succeeds now has none
      // by construction, since the backend refuses any bloque that does.
      trackEvent('slot_closed', {});
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
      // Nothing to decide: the close is refused. The dialog exists to say which
      // products are holding it up. Reported because how often the refusal fires,
      // and how deep the hole is, is the one thing worth knowing about it — and
      // it is the only outcome left, so there is no second event to pair it with.
      trackEvent('slot_close_blocked', {
        shortfallCount: short.length,
        totalShortfall: short.reduce((n, s) => n + s.shortfall, 0),
      });
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
        title="No se puede cerrar el bloque"
        footer={
          <button
            className="btn-modal-primary"
            onClick={() => setShortfalls(null)}
            disabled={busy}
          >
            Entendido
          </button>
        }
      >
        <div className="close-warning">
          <p className="muted">
            Estos productos tienen stock actual negativo: se pidió más de lo que
            hay. El bloque <strong>no se puede cerrar</strong> hasta que dejen de
            estarlo — ese faltante es trabajo pendiente y cerrar lo descartaría.
            Registrá la producción que falta, o corregí el stock inicial si el
            faltante es un error de conteo.
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
