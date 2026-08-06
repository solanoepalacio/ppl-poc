'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ManagedClient } from '@pannico/shared';
import { createClient, deleteClient, updateClient } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

/** The row being edited, held apart from the server list until it is saved. */
type EditDraft = { name: string; phone: string };

/**
 * The client directory and the controls that maintain it: an add form pinned at
 * the top, then every client — retired ones included — each editable in place.
 *
 * Editing happens **on the row** rather than in a modal: the task is fixing a
 * typo in one of two fields, and a dialog is more ceremony than that deserves.
 *
 * Removal is two different operations and the control says which it will do
 * before it is pressed. A client no order references is deleted outright; one
 * that orders reference is retired, because `Order.clientId` has no cascade and
 * closed bloques are history. One button that silently means different things
 * depending on invisible state would be worse than two labels.
 *
 * A retired client stays listed — muted, and marked in text as well, since
 * colour alone does not carry it — with a control to reinstate it. Otherwise a
 * mis-click is unrecoverable from the UI.
 */
export function ClientDirectory({ clients }: { clients: ManagedClient[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ name: '', phone: '' });
  /** Keyed by client, so one row's failure never appears on another. */
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const locked = pending || busy;

  function refresh() {
    startTransition(() => router.refresh());
  }

  function fail(id: string | null, e: unknown, fallback: string) {
    const message = e instanceof Error ? e.message : fallback;
    if (id === null) setAddError(message);
    else setRowError((prev) => ({ ...prev, [id]: message }));
  }

  async function add() {
    setAddError(null);
    setBusy(true);
    try {
      await createClient({ name: newName, phone: newPhone });
      trackEvent('client_created', { hasPhone: newPhone.trim() !== '' });
      setNewName('');
      setNewPhone('');
      refresh();
    } catch (e) {
      fail(null, e, 'No se pudo agregar el cliente.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(client: ManagedClient) {
    setEditingId(client.id);
    setDraft({ name: client.name, phone: client.phone ?? '' });
    setRowError(({ [client.id]: _dropped, ...rest }) => rest);
  }

  async function saveEdit(id: string) {
    setBusy(true);
    const before = clients.find((c) => c.id === id);
    try {
      // `phone` goes as null when cleared, which is how the API distinguishes
      // "remove the number" from "leave it alone".
      await updateClient(id, {
        name: draft.name,
        phone: draft.phone.trim() === '' ? null : draft.phone,
      });
      // Which field moved, not its contents: a client's name and number are
      // personal data and have no business leaving for an analytics host.
      trackEvent('client_updated', {
        nameChanged: before?.name !== draft.name,
        phoneChanged: (before?.phone ?? '') !== draft.phone.trim(),
      });
      setEditingId(null);
      refresh();
    } catch (e) {
      fail(id, e, 'No se pudo guardar el cliente.');
    } finally {
      setBusy(false);
    }
  }

  async function setActive(client: ManagedClient, active: boolean) {
    setBusy(true);
    try {
      await updateClient(client.id, { active });
      trackEvent(active ? 'client_reactivated' : 'client_deactivated', {
        orderCount: client.orderCount,
      });
      refresh();
    } catch (e) {
      fail(client.id, e, 'No se pudo cambiar el estado del cliente.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(client: ManagedClient) {
    const deletes = client.orderCount === 0;
    const question = deletes
      ? `¿Eliminar a "${client.name}"? No tiene pedidos y no se puede deshacer.`
      : `"${client.name}" tiene ${client.orderCount} ${
          client.orderCount === 1 ? 'pedido' : 'pedidos'
        }, así que no se puede eliminar. ¿Desactivarlo? Deja de estar disponible para pedidos nuevos y sus pedidos actuales no se tocan.`;
    if (!window.confirm(question)) return;

    setBusy(true);
    try {
      await deleteClient(client.id);
      // One control, two operations — so two events, chosen the same way the
      // server chooses: a client with orders is retired, never deleted. Folding
      // them into one would make "how much of the directory is actually being
      // destroyed" unanswerable, which is the reason to watch this at all.
      trackEvent(deletes ? 'client_deleted' : 'client_deactivated', {
        orderCount: client.orderCount,
      });
      refresh();
    } catch (e) {
      fail(client.id, e, 'No se pudo eliminar el cliente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="client-add">
        <span className="modal-section-label">Agregar cliente</span>
        <div className="client-add-row">
          <input
            type="text"
            className="client-input"
            aria-label="Nombre del cliente"
            placeholder="Nombre"
            value={newName}
            disabled={locked}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() !== '') void add();
            }}
          />
          <input
            type="tel"
            inputMode="tel"
            className="client-input"
            aria-label="Teléfono del cliente (opcional)"
            placeholder="Teléfono (opcional)"
            value={newPhone}
            disabled={locked}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() !== '') void add();
            }}
          />
          <button
            type="button"
            className="btn-modal-primary"
            onClick={() => void add()}
            disabled={locked || newName.trim() === ''}
          >
            Agregar
          </button>
        </div>
        {/* Beside the form, because that is where the correction is made. */}
        {addError && <p className="error">{addError}</p>}
      </section>

      {clients.length === 0 ? (
        <p className="muted items-empty">
          No hay clientes todavía. Agregá el primero acá arriba.
        </p>
      ) : (
        <ul className="client-list">
          {clients.map((client) => {
            const editing = editingId === client.id;
            return (
              <li
                key={client.id}
                className={client.active ? 'client-row' : 'client-row is-inactive'}
              >
                {editing ? (
                  <div className="client-edit">
                    <input
                      type="text"
                      className="client-input"
                      aria-label={`Nombre de ${client.name}`}
                      value={draft.name}
                      disabled={locked}
                      autoFocus
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      className="client-input"
                      aria-label={`Teléfono de ${client.name}`}
                      placeholder="Teléfono (opcional)"
                      value={draft.phone}
                      disabled={locked}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-modal-primary"
                      onClick={() => void saveEdit(client.id)}
                      disabled={locked || draft.name.trim() === ''}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn-modal-secondary"
                      onClick={() => setEditingId(null)}
                      disabled={locked}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="client-name">
                      {client.name}
                      {/* Text, not just the muted styling: colour alone does not
                          carry the state. */}
                      {!client.active && (
                        <span className="client-tag">inactivo</span>
                      )}
                    </span>
                    <span className="client-phone">
                      {client.phone ?? <span className="muted">sin teléfono</span>}
                    </span>
                    <span className="client-orders muted">
                      {client.orderCount === 0
                        ? 'sin pedidos'
                        : `${client.orderCount} ${
                            client.orderCount === 1 ? 'pedido' : 'pedidos'
                          }`}
                    </span>
                    <span className="client-actions">
                      <button
                        type="button"
                        className="btn-row-edit"
                        onClick={() => startEdit(client)}
                        disabled={locked}
                      >
                        Editar
                      </button>
                      {!client.active && (
                        <button
                          type="button"
                          className="btn-row-edit"
                          onClick={() => void setActive(client, true)}
                          disabled={locked}
                        >
                          Reactivar
                        </button>
                      )}
                      {/* A retired client with orders has nowhere left to go —
                          it cannot be deleted and it is already inactive — so it
                          gets no removal control at all. With no orders it can
                          still be purged. */}
                      {(client.active || client.orderCount === 0) && (
                        <button
                          type="button"
                          className="btn-row-delete"
                          onClick={() => void remove(client)}
                          disabled={locked}
                          title={
                            client.orderCount === 0
                              ? 'No tiene pedidos: se elimina'
                              : 'Tiene pedidos: se desactiva para conservarlos'
                          }
                        >
                          {client.orderCount === 0 ? 'Eliminar' : 'Desactivar'}
                        </button>
                      )}
                    </span>
                  </>
                )}
                {rowError[client.id] && (
                  <p className="error client-row-error">{rowError[client.id]}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
