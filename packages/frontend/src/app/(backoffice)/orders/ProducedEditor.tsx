'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ProducedProduct,
  Product,
  SetProducedProduct,
} from '@pannico/shared';
import { setSlotProduced } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { ProductPicker, itemsFromQuantities } from './ProductPicker';
import { Modal } from './Modal';
import { formatDateTime } from '../formatDateTime';

/** One entry as the dialog holds it: `id` absent means it has not been saved yet. */
type DraftEntry = { id?: string; quantity: number; createdAt?: string };
type Draft = Record<string, DraftEntry[]>;

/**
 * Open-bloque control to record and review *producción real* — how much of each
 * product has actually been baked — which the production views subtract from
 * their totals alongside the existencia, turning the number on screen into what
 * is still missing rather than what was originally needed.
 *
 * The dialog is a **history**, not a set of totals. Each product with production
 * recorded shows its accumulated quantity as a read-only figure, because that
 * figure is a sum: the way to change it is to change the entries behind it, which
 * "Ver detalle" reveals. There each batch shows when it was recorded, its
 * quantity can be corrected, and it can be deleted on its own. Removing a product
 * deletes its whole history and so clears its producción real.
 *
 * Everything is staged locally and committed by a single save, which sends the
 * complete desired set of entries. That is not idempotent — new entries carry no
 * id, so replaying the body would append them again — and that is the accepted
 * trade for having a history: a duplicated batch is visible here and deletable in
 * one click, where a silently doubled total would not be.
 *
 * Only editable on the open bloque, so the trigger is grayed out and unclickable
 * when `disabled`.
 */
export function ProducedEditor({
  slotId,
  products,
  current,
  disabled,
}: {
  slotId: string;
  products: Product[];
  current: ProducedProduct[];
  /** Grayed-out and unclickable when the selected bloque is not the open one. */
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  /** The staged history, keyed by product. Committed as a whole on save. */
  const [draft, setDraft] = useState<Draft>(() => draftFrom(current));
  /** The batch being added right now. Always starts empty. */
  const [batch, setBatch] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  /**
   * The entry field being typed in: its raw text plus the quantity it held when
   * editing started. `raw` lets the field go empty, which a controlled numeric
   * input otherwise cannot — clearing would parse back to the committed value and
   * be painted straight over, so typing 300 over a 1 would give 1300. `base` is
   * what an empty or sub-1 field is restored to on blur, since clearing "300"
   * passes through "30" and "3" and each of those commits.
   */
  const [typing, setTyping] = useState<
    Record<string, { raw: string; base: number }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEditing() {
    // Reset everything: the draft picks up whatever was saved since the last
    // open, and the batch must never carry a stale entry that would be added a
    // second time.
    setDraft(draftFrom(current));
    setBatch({});
    setExpanded(new Set());
    setTyping({});
    setError(null);
    setEditing(true);
  }

  function toggle(productId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function setEntryQuantity(productId: string, i: number, quantity: number) {
    setDraft((prev) => {
      const entries = [...(prev[productId] ?? [])];
      entries[i] = { ...entries[i], quantity };
      return { ...prev, [productId]: entries };
    });
  }

  function removeEntry(productId: string, i: number) {
    setDraft((prev) => {
      const entries = (prev[productId] ?? []).filter((_, j) => j !== i);
      // Dropping the last entry clears the product; keep the empty array so the
      // save still tells the server to delete what it had.
      return { ...prev, [productId]: entries };
    });
  }

  /** Removes the product: its whole history goes, and so does its figure. */
  function removeProduct(productId: string) {
    setDraft((prev) => ({ ...prev, [productId]: [] }));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  async function save() {
    setError(null);
    // Merge the batch in as new (id-less) entries, then send the whole thing.
    const merged: Draft = { ...draft };
    for (const { productId, quantity } of itemsFromQuantities(batch)) {
      merged[productId] = [...(merged[productId] ?? []), { quantity }];
    }
    const items: SetProducedProduct[] = Object.entries(merged).map(
      ([productId, entries]) => ({
        productId,
        entries: entries
          .filter((e) => e.quantity > 0)
          .map((e) => (e.id ? { id: e.id, quantity: e.quantity } : { quantity: e.quantity })),
      }),
    );
    try {
      await setSlotProduced(slotId, items);
      trackEvent('produced_saved', producedProps(items, current));
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo guardar la producción real.',
      );
    }
  }

  const nameOf = (productId: string) =>
    current.find((p) => p.productId === productId)?.name ??
    products.find((p) => p.id === productId)?.name ??
    productId;

  // Only products that still have entries staged are listed, in the draft's own
  // key order — which is the server's order: by each product's first recorded
  // batch. The list reads as a log of the bloque's baking, not as a catalog.
  const listed = Object.entries(draft).filter(([, entries]) =>
    entries.some((e) => e.quantity > 0),
  );

  return (
    <>
      <button
        className="btn-toolbar-ghost"
        onClick={startEditing}
        disabled={pending || disabled}
      >
        Producción Real
      </button>
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Producción real"
        aboveBody={
          <p className="muted modal-above-hint">
            Producción Real por bloque de cada producto con detalle histórico
          </p>
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
              Guardar producción
            </button>
          </>
        }
      >
        <ProductPicker
          products={products}
          quantities={batch}
          onChange={(id, quantity) =>
            // Zero drops the key so the batch list keeps entry order and a
            // re-added product appends (see SelectedItems).
            setBatch((q) => {
              if (quantity > 0) return { ...q, [id]: quantity };
              const { [id]: _dropped, ...rest } = q;
              return rest;
            })
          }
          disabled={pending}
          searchId="produced-product"
          emptyText="Buscá un producto abajo para sumar lo que se produjo ahora."
          before={
            <div className="prod-hist">
              {listed.length === 0 ? (
                <p className="muted prod-hist-empty">
                  Todavía no se registró producción en este bloque.
                </p>
              ) : (
                <ul className="prod-hist-list">
                  {listed.map(([productId, entries]) => {
                    const total = entries.reduce((n, e) => n + e.quantity, 0);
                    const open = expanded.has(productId);
                    return (
                      <li className="prod-hist-item" key={productId}>
                        <div className="prod-hist-head">
                          <span className="prod-hist-name">
                            {nameOf(productId)}
                          </span>
                          <span className="prod-hist-total">{total}</span>
                          <button
                            type="button"
                            className="prod-hist-toggle"
                            onClick={() => toggle(productId)}
                            aria-expanded={open}
                            disabled={pending}
                          >
                            {open ? 'Ocultar detalle' : 'Ver detalle'}
                          </button>
                          <button
                            type="button"
                            className="prod-hist-drop"
                            onClick={() => removeProduct(productId)}
                            aria-label={`Eliminar toda la producción de ${nameOf(productId)}`}
                            title="Eliminar todo el historial de este producto"
                            disabled={pending}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        {open && (
                          <ul className="prod-hist-entries">
                            {entries.map((entry, i) => {
                              const key = `${productId}:${entry.id ?? `nuevo-${i}`}`;
                              return (
                              <li className="prod-hist-entry" key={key}>
                                <span className="prod-hist-when">
                                  {formatWhen(entry.createdAt)}
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  className="prod-hist-qty"
                                  value={typing[key]?.raw ?? String(entry.quantity)}
                                  onFocus={() =>
                                    setTyping((t) => ({
                                      ...t,
                                      [key]: {
                                        raw: String(entry.quantity),
                                        base: entry.quantity,
                                      },
                                    }))
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    setTyping((t) => ({
                                      ...t,
                                      [key]: {
                                        raw,
                                        base: t[key]?.base ?? entry.quantity,
                                      },
                                    }));
                                    const n = Math.floor(Number(raw));
                                    if (raw !== '' && Number.isFinite(n) && n >= 1) {
                                      setEntryQuantity(productId, i, n);
                                    }
                                  }}
                                  onBlur={() => {
                                    const leaving = typing[key];
                                    const n = Math.floor(Number(leaving?.raw));
                                    if (leaving && !(leaving.raw !== '' && n >= 1)) {
                                      setEntryQuantity(productId, i, leaving.base);
                                    }
                                    setTyping(({ [key]: _dropped, ...rest }) => rest);
                                  }}
                                  disabled={pending}
                                  aria-label={`Cantidad del registro del ${formatWhen(entry.createdAt)}`}
                                />
                                <button
                                  type="button"
                                  className="prod-hist-drop"
                                  onClick={() => removeEntry(productId, i)}
                                  aria-label="Eliminar este registro"
                                  title="Eliminar este registro"
                                  disabled={pending}
                                >
                                  <TrashIcon />
                                </button>
                              </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          }
        />
        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}

/**
 * What a save did, read off the submitted set against what the server held.
 *
 * `added` and `removed` are separated from the totals because the save is
 * deliberately non-idempotent — an id-less entry appends — so a replayed body
 * duplicates a batch. Counting appends and deletions per save is what makes that
 * trade observable: a run of saves that add and then remove the same amount is
 * the manager cleaning up a double-submit, which the totals alone would hide.
 */
function producedProps(items: SetProducedProduct[], current: ProducedProduct[]) {
  const entries = items.flatMap((i) => i.entries);
  const submitted = new Set(
    entries.map((e) => e.id).filter((id): id is string => id !== undefined),
  );
  return {
    productCount: items.filter((i) => i.entries.length > 0).length,
    entryCount: entries.length,
    totalQuantity: entries.reduce((n, e) => n + e.quantity, 0),
    added: entries.filter((e) => e.id === undefined).length,
    removed: current
      .flatMap((p) => p.entries)
      .filter((e) => !submitted.has(e.id)).length,
  };
}

function draftFrom(current: ProducedProduct[]): Draft {
  return Object.fromEntries(
    current.map((p) => [
      p.productId,
      p.entries.map((e) => ({
        id: e.id,
        quantity: e.quantity,
        createdAt: e.createdAt,
      })),
    ]),
  );
}

/**
 * Locale pinned to `es-AR` rather than left to the runtime's default. The server
 * renders with an empty LANG and would pick `en-US`, so an unpinned format
 * produces different text on the server than in the browser and React reports a
 * hydration mismatch. An unsaved entry has no timestamp yet.
 */
function formatWhen(createdAt?: string): string {
  if (!createdAt) return 'Sin guardar';
  return formatDateTime(createdAt);
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
