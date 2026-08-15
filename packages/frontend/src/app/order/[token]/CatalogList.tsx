'use client';

import { useMemo } from 'react';
import {
  normalizeForSearch,
  type OrderMeasure,
  type Product,
} from '@pannico/shared';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * The whole catalog as a scannable, alphabetically sorted list — one row per
 * product with its own typed quantity field. A product is on the order purely
 * by having a quantity above zero; there is no separate add step. The `filter`
 * narrows which rows render (accent/case-insensitive on the name) and nothing
 * else: a row hidden by the filter keeps its quantity and still counts toward
 * the order. Pure presentational — quantities live in the parent.
 *
 * A product sold by the pack also carries a choice of measure, defaulting to
 * unidad. One without a pack shows a plain label instead of a disabled control:
 * a control that cannot be used invites the customer to try it and wonder what
 * is wrong, while the label answers the same question — *in what?* — and offers
 * nothing.
 */
export function CatalogList({
  products,
  quantities,
  measures,
  onChange,
  onMeasureChange,
  filter,
  disabled,
}: {
  products: Product[];
  quantities: Record<string, number>;
  /** What each product's quantity is counted in. Absent means units. */
  measures: Record<string, OrderMeasure>;
  onChange: (productId: string, quantity: number) => void;
  onMeasureChange: (productId: string, measure: OrderMeasure) => void;
  filter: string;
  disabled?: boolean;
}) {
  const selectAllOnFocus = useSelectAllOnFocus();

  // Sort once by name; the catalog's fetch order is not alphabetical.
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [products],
  );

  const visible = useMemo(() => {
    const q = normalizeForSearch(filter);
    if (!q) return sorted;
    return sorted.filter((p) => normalizeForSearch(p.name).includes(q));
  }, [sorted, filter]);

  if (visible.length === 0) {
    return <p className="muted items-empty">Sin resultados</p>;
  }

  return (
    <ul className="item-fields item-fields--order">
      {visible.map((p) => {
        const value = quantities[p.id] ?? 0;
        const byPack = p.packSize > 0;
        const measure = measures[p.id] ?? 'unit';
        return (
          <li key={p.id} data-product-id={p.id} className="item-field">
            <span className="item-field-name">
              <label htmlFor={`qty-${p.id}`}>{p.name}</label>
              {byPack ? (
                <span className="item-pack-hint">
                  El paquete trae {p.packSize}{' '}
                  {p.packSize === 1 ? 'unidad' : 'unidades'}
                </span>
              ) : null}
            </span>
            <div className="item-qty">
              <input
                id={`qty-${p.id}`}
                className="qty-input"
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Cantidad de ${p.name}`}
                value={value === 0 ? '' : value}
                placeholder="0"
                disabled={disabled}
                {...selectAllOnFocus}
                onChange={(e) =>
                  onChange(
                    p.id,
                    Math.max(0, Math.floor(Number(e.target.value) || 0)),
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
              {/* Nothing to clear on a row still at zero, so the control only
                  appears once the product is actually on the order. */}
              {value > 0 && (
                <button
                  type="button"
                  className="item-remove"
                  aria-label={`Vaciar cantidad de ${p.name}`}
                  disabled={disabled}
                  onClick={() => onChange(p.id, 0)}
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
              )}
              {byPack ? (
                <select
                  className="item-measure"
                  aria-label={`Pedir ${p.name} por unidad o por paquete`}
                  value={measure}
                  disabled={disabled}
                  onChange={(e) =>
                    onMeasureChange(p.id, e.target.value as OrderMeasure)
                  }
                >
                  <option value="unit">unidad</option>
                  <option value="pack">paquete</option>
                </select>
              ) : (
                <span className="item-measure item-measure--fixed">unidad</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
