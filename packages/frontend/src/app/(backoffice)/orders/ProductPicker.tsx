'use client';

import { useState } from 'react';
import type { Product } from '@pannico/shared';

import { ProductCombobox } from './ProductCombobox';
import { SelectedItems } from './SelectedItems';

/**
 * Searchable product-quantity editor shared by the create-order, edit-items, and
 * stock dialogs. The list shows only the products already on it (quantity > 0),
 * each with a stepper and a remove control; products are added one at a time from
 * a search pinned at the bottom of the list, whose results open upward. The
 * quantity map lives in the parent (it owns the submit); this component owns only
 * the just-added highlight. Render it as the modal body and put the section title
 * in the modal's pinned top region.
 */
export function ProductPicker({
  products,
  quantities,
  onChange,
  disabled,
  searchId,
  emptyText,
  before,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
  disabled?: boolean;
  /** Unique id for the search input (aria wiring), e.g. "edit-items-product". */
  searchId: string;
  /** Empty-state copy; the default speaks of adding products to an order. */
  emptyText?: string;
  /**
   * Content to sit above the added-products list **inside the same scrolling
   * region**, for a dialog that shows existing records before the ones being
   * added. Kept here rather than in the modal's pinned region so the two lists
   * scroll as one: two scroll areas stacked in a short dialog leave the upper
   * one a few rows tall and awkward to move through.
   */
  before?: React.ReactNode;
}) {
  const [justAdded, setJustAdded] = useState<{ id: string; n: number } | null>(
    null,
  );
  const addedIds = Object.keys(quantities).filter((id) => quantities[id] > 0);

  function add(productId: string) {
    if (!(quantities[productId] > 0)) onChange(productId, 1);
    setJustAdded((prev) => ({ id: productId, n: (prev?.n ?? 0) + 1 }));
  }

  return (
    <div className="order-form-body">
      {before}
      <SelectedItems
        products={products}
        quantities={quantities}
        onChange={onChange}
        onRemove={(id) => onChange(id, 0)}
        disabled={disabled}
        highlight={justAdded}
        {...(emptyText ? { emptyText } : {})}
      />
      <div className="product-add-bar">
        <ProductCombobox
          id={searchId}
          products={products}
          addedIds={addedIds}
          onAdd={add}
          disabled={disabled}
          dropUp
        />
      </div>
    </div>
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
