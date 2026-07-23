'use client';

import { useMemo, useState } from 'react';
import { normalizeForSearch, type Product } from '@pannico/shared';

/**
 * Type-ahead product picker for the order-creation modal. A single text input
 * filters the catalog by name (accent/case-insensitive); picking a product adds
 * it to the order via `onAdd` and clears the query so the manager can keep
 * adding one after another. Products already on the order are excluded from the
 * results (adjust their quantity in the added-items list instead). Hand-rolled
 * to mirror ClientCombobox — no component library; state is local.
 */
export function ProductCombobox({
  products,
  addedIds,
  onAdd,
  id = 'product-combobox',
  disabled,
}: {
  products: Product[];
  /** Ids already on the order — hidden from the results. */
  addedIds: string[];
  onAdd: (productId: string) => void;
  id?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const added = useMemo(() => new Set(addedIds), [addedIds]);
  const filtered = useMemo(() => {
    const available = products.filter((p) => !added.has(p.id));
    const q = normalizeForSearch(query);
    if (!q) return available;
    return available.filter((p) => normalizeForSearch(p.name).includes(q));
  }, [products, added, query]);

  function add(product: Product) {
    onAdd(product.id);
    setQuery('');
    setActiveIndex(0);
    setOpen(false); // close on pick; the added row highlights so the pick is clear
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        e.preventDefault();
        add(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        // Close only the dropdown; stop the native <dialog> from also closing.
        // When the dropdown is already closed, let Escape bubble to close the dialog.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  }

  return (
    // `combobox-up` opens the results above the input — the search sits at the
    // bottom of the list, so a downward menu would spill past the modal.
    <div className="field combobox combobox-up">
      <div className="combobox-control">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-label="Buscar un producto para agregar"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          autoComplete="off"
          placeholder="Buscá un producto para agregar…"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          // Re-open on click too: after adding a product the input keeps focus,
          // so a click would not re-fire onFocus to expand the list again.
          onClick={() => setOpen(true)}
          // Delay the close so a click on an option registers before blur.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
        />
        {open && (
          <ul className="combobox-list" id={`${id}-list`} role="listbox">
            {filtered.length === 0 ? (
              <li className="combobox-empty" aria-disabled="true">
                {products.length === added.size
                  ? 'Ya agregaste todos los productos'
                  : 'Sin resultados'}
              </li>
            ) : (
              filtered.map((p, i) => {
                const salty = p.category === 'salty';
                return (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={i === activeIndex ? 'is-active' : undefined}
                    // onMouseDown fires before the input's blur, so the pick lands.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add(p);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <span>{p.name}</span>
                    <span className={salty ? 'cat-tag salty' : 'cat-tag sweet'}>
                      {salty ? 'salado' : 'dulce'}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
