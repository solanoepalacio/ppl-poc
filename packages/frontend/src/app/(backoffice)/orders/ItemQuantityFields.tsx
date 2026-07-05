'use client';

import type { Product } from '@pannico/shared';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * Catalog rows with a quantity stepper each, shared by the create-order,
 * edit-items, and stock forms. Each row shows the product name + a category tag
 * (salado / dulce) and a −/value/+ stepper; the value stays typeable so large
 * quantities don't require many clicks. Quantity 0 means "not in the order";
 * callers drop zeros before submitting. Pure presentational — state lives in the
 * parent. When `unitLabel` is set, a sticky "Producto / <unit>" header is shown.
 */
export function ItemQuantityFields({
  products,
  quantities,
  onChange,
  disabled,
  unitLabel,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  disabled?: boolean;
  /** Right-column label for the sticky header, e.g. "cant." or "en stock". */
  unitLabel?: string;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();
  return (
    <ul className="item-fields">
      {unitLabel && (
        <li className="item-fields-head" aria-hidden="true">
          <span>Producto</span>
          <span>{unitLabel}</span>
        </li>
      )}
      {products.map((p) => {
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
                disabled={disabled || value <= 0}
                onClick={() => onChange(p.id, Math.max(0, value - 1))}
              >
                −
              </button>
              <input
                id={`qty-${p.id}`}
                className={value > 0 ? 'step-value' : 'step-value zero'}
                type="number"
                min={0}
                value={value}
                disabled={disabled}
                {...selectAllOnFocus}
                onChange={(e) =>
                  onChange(
                    p.id,
                    Math.max(0, Math.floor(Number(e.target.value) || 0)),
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Builds the API item list from a quantity map, dropping zero/empty entries. */
export function itemsFromQuantities(
  quantities: Record<string, number>,
): { productId: string; quantity: number }[] {
  return Object.entries(quantities)
    .filter(([, n]) => n > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
}
