'use client';

import { useState } from 'react';
import { type Client, type CreateLinkResponse } from '@pannico/shared';
import { createLink } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { Modal } from './Modal';
import { ClientCombobox } from './ClientCombobox';

/**
 * Issues a shareable, single-use tokenized order link for a client to fill in
 * themselves (shared over WhatsApp). Launched from the bloque toolbar next to
 * "Agregar pedido" — a dedicated modal, separate from order creation: the manager
 * picks a client and generates the link, then copies it. The link is valid for
 * the open bloque, so the trigger is grayed out and unclickable on any other
 * bloque.
 */
export function GenerateLinkModal({
  clients,
  disabled,
}: {
  clients: Client[];
  /** Grayed-out and unclickable when the selected bloque is not the open one. */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = clientId !== null;

  function reset() {
    setClientId(null);
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

  async function generateLink() {
    setError(null);
    setBusy(true);
    try {
      const res = await createLink(clientId!);
      trackEvent('order_link_generated');
      setResult(res);
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

  const footer = result ? (
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
        className="btn-modal-primary"
        onClick={() => void generateLink()}
        disabled={!valid || busy}
      >
        {busy ? 'Generando…' : 'Generar link'}
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
        Generar link
      </button>

      <Modal open={open} onClose={close} title="Generar link" footer={footer}>
        {result ? (
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
        ) : (
          <ClientCombobox
            key={open ? 'open' : 'closed'}
            id="generate-link-client"
            clients={clients}
            onSelect={setClientId}
            disabled={busy}
            autoFocus
          />
        )}
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
