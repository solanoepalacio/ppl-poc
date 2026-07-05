'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeCurrentSlot } from '@/lib/api';

/**
 * Closes the current open bloque (with a confirm), which atomically opens a
 * fresh one on the backend. Refreshes the server-rendered list to reconcile,
 * following the client-island-mutates-then-refresh pattern. Grayed out and
 * unclickable via `disabled` when the selected bloque is not the open one.
 */
export function CloseSlotButton({ disabled }: { disabled?: boolean }) {
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
    <>
      <button
        type="button"
        className="btn-toolbar-ghost"
        onClick={() => void onClose()}
        disabled={pending || disabled}
      >
        Cerrar bloque
      </button>
      {error && <span className="bo-toolbar-note"> · falló</span>}
    </>
  );
}
