'use client';

import { useMemo, useState } from 'react';
import { normalizeForSearch, type Client } from '@pannico/shared';

/**
 * Type-ahead client picker for the order-creation modal. A single text input
 * filters the injected client directory by name (accent/case-insensitive) as
 * the manager types; picking a client reports its id to the parent, which gates
 * the create actions on a selection. Hand-rolled (no component library): state
 * is local, the selected id is lifted via `onSelect`. Remount (via `key`) to
 * reset it.
 */
export function ClientCombobox({
  clients,
  onSelect,
  id = 'client-combobox',
  disabled,
  autoFocus,
}: {
  clients: Client[];
  onSelect: (clientId: string | null) => void;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return clients;
    return clients.filter((c) => normalizeForSearch(c.name).includes(q));
  }, [clients, query]);

  function choose(client: Client) {
    setQuery(client.name);
    onSelect(client.id);
    setOpen(false);
  }

  function handleChange(value: string) {
    setQuery(value);
    onSelect(null); // typing clears any prior selection until a client is picked
    setOpen(true);
    setActiveIndex(0);
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
        choose(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="field combobox">
      <label htmlFor={id}>Cliente</label>
      <div className="combobox-control">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          autoComplete="off"
          placeholder="Buscá un cliente…"
          value={query}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          // Delay the close so a click on an option registers before blur.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
        />
        {open && (
          <ul className="combobox-list" id={`${id}-list`} role="listbox">
            {filtered.length === 0 ? (
              <li className="combobox-empty" aria-disabled="true">
                Sin resultados
              </li>
            ) : (
              filtered.map((c, i) => (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={i === activeIndex ? 'is-active' : undefined}
                  // onMouseDown fires before the input's blur, so the pick lands.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {c.name}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
