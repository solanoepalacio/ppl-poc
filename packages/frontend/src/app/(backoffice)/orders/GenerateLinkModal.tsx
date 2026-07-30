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
    <button className="btn-modal-primary" onClick={close}>
      Listo
    </button>
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
        <ClientCombobox
          key={open ? 'open' : 'closed'}
          id="generate-link-client"
          clients={clients}
          onSelect={setClientId}
          // Once the link is generated the selection is locked in — the link is
          // bound to this client, so the picker becomes read-only.
          disabled={busy || result !== null}
          autoFocus
        />

        {result && (
          <div className="card link-card">
            <p className="muted">
              Compartí este enlace con el cliente por WhatsApp:
            </p>
            <div className="link-row">
              <button
                type="button"
                className={copied ? 'copy-btn is-copied' : 'copy-btn'}
                onClick={() => void copy()}
                aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
                title={copied ? 'Copiado' : 'Copiar enlace'}
              >
                {copied ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
              <code>{result.url}</code>
            </div>
            <p className="muted">
              Para {result.clientName} · válido durante el bloque #
              {result.slotSeq}
            </p>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
