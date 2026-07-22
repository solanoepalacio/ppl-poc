'use client';

import type { Product } from '@pannico/shared';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * The order's added products — one row per product with a positive quantity,
 * each with a −/value/+ stepper and a remove button. Products are added from the
 * ProductCombobox above; this list only ever shows what is already on the order,
 * so the manager sees the order's contents at a glance without scrolling the
 * whole catalog. Pure presentational — state lives in the parent. Removing a row
 * (or stepping it to zero) drops the product from the order.
 */
export function SelectedItems({
  products,
  quantities,
  onChange,
  onRemove,
  disabled,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  disabled?: boolean;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();
  // Keep catalog order, but show only products actually on the order.
  const added = products.filter((p) => (quantities[p.id] ?? 0) > 0);

  if (added.length === 0) {
    return (
      <p className="muted items-empty">
        Todavía no agregaste productos. Buscá uno arriba para agregarlo al pedido.
      </p>
    );
  }

  return (
    <ul className="item-fields">
      <li className="item-fields-head" aria-hidden="true">
        <span>Producto</span>
        <span>cant.</span>
      </li>
      {added.map((p) => {
        const value = quantities[p.id] ?? 0;
        const salty = p.category === 'salty';
        return (
          <li key={p.id} className="item-field">
            <span className="item-field-name">
              <label htmlFor={`qty-${p.id}`}>{p.name}</label>
              <span className={salty ? 'cat-tag salty' : 'cat-tag sweet'}>
                {salty ? 'salado' : 'dulce'}
              </span>
            </span>
            <div className="item-stepper">
              <button
                type="button"
                className="step-btn"
                aria-label={`Restar ${p.name}`}
                disabled={disabled || value <= 1}
                onClick={() => onChange(p.id, Math.max(1, value - 1))}
              >
                −
              </button>
              <input
                id={`qty-${p.id}`}
                className="step-value"
                type="number"
                min={1}
                value={value}
                disabled={disabled}
                {...selectAllOnFocus}
                onChange={(e) =>
                  onChange(
                    p.id,
                    Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  )
                }
              />
              <button
                type="button"
                className="step-btn"
                aria-label={`Sumar ${p.name}`}
                disabled={disabled}
                onClick={() => onChange(p.id, value + 1)}
              >
                +
              </button>
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
