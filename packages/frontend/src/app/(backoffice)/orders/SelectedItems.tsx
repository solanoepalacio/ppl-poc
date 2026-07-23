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
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  disabled?: boolean;
  /** Product to reveal + flash; `n` bumps so a re-add re-triggers the effect. */
  highlight?: { id: string; n: number } | null;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();
  const listRef = useRef<HTMLUListElement>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Keep catalog order, but show only products actually on the order.
  const added = products.filter((p) => (quantities[p.id] ?? 0) > 0);

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
    return (
      <p className="muted items-empty">
        Todavía no agregaste productos. Buscá uno abajo para agregarlo al pedido.
      </p>
    );
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
              <span className={salty ? 'cat-tag salty' : 'cat-tag sweet'}>
                {salty ? 'salado' : 'dulce'}
              </span>
            </span>
            <div className="item-qty">
              <input
                id={`qty-${p.id}`}
                className="qty-input"
                type="number"
                min={1}
                inputMode="numeric"
                aria-label={`Cantidad de ${p.name}`}
                value={value}
                disabled={disabled}
                {...selectAllOnFocus}
                onChange={(e) =>
                  onChange(
                    p.id,
                    Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  )
                }
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
