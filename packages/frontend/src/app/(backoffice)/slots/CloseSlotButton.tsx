'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeCurrentSlot } from '@/lib/api';

/**
 * Closes the current open bloque (with a confirm), which atomically opens a
 * fresh one on the backend. Refreshes the server-rendered list to reconcile,
 * following the client-island-mutates-then-refresh pattern.
 */
export function CloseSlotButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  async function onClose() {
    if (
      !window.confirm(
        'Cerrar el bloque actual y abrir uno nuevo. Las órdenes nuevas irán al nuevo bloque. ¿Continuar?',
      )
    ) {
      return;
    }
    setError(false);
    try {
      await closeCurrentSlot();
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    }
  }

  return (
    <span>
      <button type="button" onClick={() => void onClose()} disabled={pending}>
        Cerrar bloque actual
      </button>
      {error && <span className="muted"> · falló</span>}
    </span>
  );
}
