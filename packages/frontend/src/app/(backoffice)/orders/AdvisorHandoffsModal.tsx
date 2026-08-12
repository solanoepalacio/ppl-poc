'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WhatsappHandoff } from '@pannico/shared';
import { endWhatsappHandoff, getWhatsappHandoffs } from '@/lib/api';
import { Modal } from './Modal';

const COPY = {
  trigger: 'Asesoría',
  title: 'Asesoría',
  loading: 'Cargando…',
  empty: 'No hay charlas abiertas.',
  disabled:
    'El agente de WhatsApp no está configurado, así que no puede haber charlas nuevas.',
  intro:
    'Charlas que ahora atiende una persona. Mientras estén acá el agente no les responde nada. Se cierran solas cuando el cliente deja de escribir. Al finalizar una, el cliente recibe un aviso de que la asesoría terminó.',
  end: 'Finalizar',
  ending: 'Finalizando…',
  refresh: 'Actualizar',
  refreshing: 'Actualizando…',
  gone: 'Esa charla ya había terminado.',
  failed: 'No se pudo. Intentá de nuevo.',
  close: 'Cerrar',
  unknown: 'Número sin cliente',
};

/**
 * The conversations currently in a person's hands, and a way to end any of them.
 *
 * A handover ends on its own once the customer goes quiet, which is a guess made
 * from the outside: only whoever had the conversation knows it is over, and until
 * it lapses that customer cannot get a link even by asking. This is where they
 * say so.
 *
 * Launched from the bloque toolbar but **not** tied to a bloque — a conversation
 * outlives one — so unlike its neighbours it is never disabled.
 *
 * Fetched when it opens rather than with the page: it is a control opened on
 * purpose, and a list read at page load would be stale by the time anyone looked
 * at it. Nothing else on the page depends on it, so ending one refetches this
 * list and leaves the rest of the page alone.
 */
export function AdvisorHandoffsModal() {
  const [open, setOpen] = useState(false);
  const [handoffs, setHandoffs] = useState<WhatsappHandoff[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNote(null);
    try {
      const res = await getWhatsappHandoffs();
      setEnabled(res.enabled);
      setHandoffs(res.handoffs);
    } catch {
      setHandoffs([]);
      setNote(COPY.failed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function end(sender: string) {
    setEnding(sender);
    setNote(null);
    try {
      const { ended } = await endWhatsappHandoff(sender);
      // Not an error: it lapsed on its own, or somebody else ended it. The list
      // is what was true a moment ago, so say what happened and reload rather
      // than leaving a row that no longer exists.
      if (!ended) setNote(COPY.gone);
      await load();
    } catch {
      setNote(COPY.failed);
    } finally {
      setEnding(null);
    }
  }

  const rows = handoffs ?? [];

  return (
    <>
      <button
        type="button"
        className="btn-toolbar-ghost"
        onClick={() => setOpen(true)}
      >
        {COPY.trigger}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={COPY.title}
        footer={
          <>
            {/* The list is a snapshot: a conversation can open, lapse or be
                ended by somebody else while this stays on screen. Re-reading it
                is a deliberate act rather than a timer — this is opened to act
                on, not left up on a wall, and a list that reshuffles itself
                under the cursor is worse than one that is honestly stale. */}
            <button
              className="btn-modal-secondary"
              onClick={() => void load()}
              disabled={loading || ending !== null}
            >
              {loading ? COPY.refreshing : COPY.refresh}
            </button>
            <button className="btn-modal-primary" onClick={() => setOpen(false)}>
              {COPY.close}
            </button>
          </>
        }
      >
        {!enabled && <p className="error">{COPY.disabled}</p>}
        <p className="muted">{COPY.intro}</p>

        {loading && handoffs === null ? (
          <p className="muted">{COPY.loading}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{COPY.empty}</p>
        ) : (
          <ul className="handoff-list">
            {rows.map((h) => (
              <li className="handoff-row" key={h.sender}>
                <div className="handoff-who">
                  <strong>{h.clientName ?? COPY.unknown}</strong>
                  <span className="muted">
                    {h.sender} · desde {clockOf(h.startedAt)} · termina sola{' '}
                    {remainingOf(h.expiresAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={() => void end(h.sender)}
                  disabled={ending !== null}
                >
                  {ending === h.sender ? COPY.ending : COPY.end}
                </button>
              </li>
            ))}
          </ul>
        )}

        {note && <p className="muted">{note}</p>}
      </Modal>
    </>
  );
}

/**
 * Formatted in the browser only — this list is never server-rendered, so the
 * locale mismatch that would otherwise show up as a hydration warning cannot
 * arise here.
 */
const clockOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

/** A snapshot, like the rest of the list: reopening the control refreshes it. */
function remainingOf(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ya';
  const minutes = Math.ceil(ms / 60_000);
  return minutes === 1 ? 'en menos de 1 min' : `en ${minutes} min`;
}
