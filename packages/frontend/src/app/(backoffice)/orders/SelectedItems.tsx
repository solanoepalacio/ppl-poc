'use client';

import { useEffect, useRef, useState } from 'react';
import type { Product } from '@pannico/shared';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * The order's added products — one row per product with a positive quantity,
 * each with a −/value/+ stepper and a remove button. Products are added from the
 * ProductCombobox above; this list only ever shows what is already on the order,
 * so the manager sees the order's contents at a glance without scrolling the
 * whole catalog. Pure presentational — state lives in the parent. Removing a row
 * (or stepping it to zero) drops the product from the order. When `highlight`
 * changes, the matching row is scrolled into view and briefly flashed so the
 * manager sees where a just-added product landed.
 */
export function SelectedItems({
  products,
  quantities,
  onChange,
  onRemove,
  disabled,
  highlight,
  emptyText = 'Todavía no agregaste productos. Buscá uno abajo para agregarlo al pedido.',
  showCategory = true,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  disabled?: boolean;
  /** Product to reveal + flash; `n` bumps so a re-add re-triggers the effect. */
  highlight?: { id: string; n: number } | null;
  /** Empty-state copy; the direction to the search differs by surface. */
  emptyText?: string;
  /** The salado/dulce pill is production-facing; hidden on the customer view. */
  showCategory?: boolean;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();
  const listRef = useRef<HTMLUListElement>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  /**
   * The field being typed in, by product id: its raw text plus the quantity it
   * held when editing started.
   *
   * `raw` exists because the quantity can never be empty (the row exists because
   * it is at least 1) but the *field* has to be, or the value cannot be cleared:
   * clearing sends '', which parses back to the committed quantity and is painted
   * straight over, so typing 300 over a 1 yields 1300.
   *
   * `base` exists because clearing "300" passes through "30" and "3", each of
   * which commits. Falling back to the last committed value would leave 3 — a
   * number the manager only typed through on the way out. Blurring an empty or
   * sub-1 field restores `base` instead.
   */
  const [draft, setDraft] = useState<
    Record<string, { raw: string; base: number }>
  >({});

  // The quantity map's own key order IS the entry order: parents append a key
  // when a product is added and delete it when removed (so re-adding appends),
  // and the map is seeded from the API's stored order when editing. Iterating
  // the catalog here instead is what used to impose alphabetical order.
  const byId = new Map(products.map((p) => [p.id, p]));
  const added = Object.keys(quantities)
    .filter((id) => (quantities[id] ?? 0) > 0)
    .map((id) => byId.get(id))
    .filter((p): p is Product => p !== undefined);

  const highlightId = highlight?.id;
  const highlightN = highlight?.n;
  useEffect(() => {
    if (!highlightId) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-product-id="${CSS.escape(highlightId)}"]`,
    );
    if (!row) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    setFlashId(highlightId);
    const timer = window.setTimeout(() => setFlashId(null), 1100);
    return () => window.clearTimeout(timer);
  }, [highlightId, highlightN]);

  if (added.length === 0) {
    return <p className="muted items-empty">{emptyText}</p>;
  }

  return (
    <ul className="item-fields item-fields--order" ref={listRef}>
      {added.map((p) => {
        const value = quantities[p.id] ?? 0;
        const salty = p.category === 'salty';
        return (
          <li
            key={p.id}
            data-product-id={p.id}
            className={p.id === flashId ? 'item-field is-added' : 'item-field'}
          >
            <span className="item-field-name">
              <label htmlFor={`qty-${p.id}`}>{p.name}</label>
              {showCategory && (
                <span className={salty ? 'cat-tag salty' : 'cat-tag sweet'}>
                  {salty ? 'salado' : 'dulce'}
                </span>
              )}
            </span>
            <div className="item-qty">
              <input
                id={`qty-${p.id}`}
                className="qty-input"
                type="number"
                min={1}
                inputMode="numeric"
                aria-label={`Cantidad de ${p.name}`}
                value={draft[p.id]?.raw ?? String(value)}
                disabled={disabled}
                {...selectAllOnFocus}
                onFocus={(e) => {
                  selectAllOnFocus.onFocus(e);
                  setDraft((d) => ({
                    ...d,
                    [p.id]: { raw: String(value), base: value },
                  }));
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    [p.id]: { raw, base: d[p.id]?.base ?? value },
                  }));
                  // Only a usable quantity is committed upward, so the row's
                  // quantity is never briefly empty or zero.
                  const n = Math.floor(Number(raw));
                  if (raw !== '' && Number.isFinite(n) && n >= 1) {
                    onChange(p.id, n);
                  }
                }}
                onBlur={() => {
                  const leaving = draft[p.id];
                  const n = Math.floor(Number(leaving?.raw));
                  if (leaving && !(leaving.raw !== '' && n >= 1)) {
                    // Left empty or below the minimum: put back what the field
                    // started with, not the digits it passed through.
                    onChange(p.id, leaving.base);
                  }
                  setDraft(({ [p.id]: _dropped, ...rest }) => rest);
                }}
                onKeyDown={(e) => {
                  // Enter confirms the typed value and drops focus, rather than
                  // leaving the field focused (which reads as still-editing).
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
              <button
                type="button"
                className="item-remove"
                aria-label={`Quitar ${p.name}`}
                disabled={disabled}
                onClick={() => onRemove(p.id)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
