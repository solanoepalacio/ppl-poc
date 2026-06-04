'use client';

import type { Product } from '@pannico/shared';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * Catalog rows with a quantity input each, shared by the create-order and
 * edit-items forms. Quantity 0 means "not in the order"; callers drop zeros
 * before submitting. Pure presentational — state lives in the parent.
 */
export function ItemQuantityFields({
  products,
  quantities,
  onChange,
  disabled,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  disabled?: boolean;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();
  return (
    <ul className="item-fields">
      {products.map((p) => (
        <li key={p.id} className="row">
          <label htmlFor={`qty-${p.id}`}>{p.name}</label>
          <input
            id={`qty-${p.id}`}
            className="qty"
            type="number"
            min={0}
            value={quantities[p.id] ?? 0}
            disabled={disabled}
            {...selectAllOnFocus}
            onChange={(e) =>
              onChange(
                p.id,
                Math.max(0, Math.floor(Number(e.target.value) || 0)),
              )
            }
          />
        </li>
      ))}
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
