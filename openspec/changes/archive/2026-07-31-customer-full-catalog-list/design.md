## Context

`OrderForm.tsx` (`/order/[token]`) currently composes two back-office-shared
components: `ProductCombobox` (search-to-add, excludes already-added
products from its results) above, and `SelectedItems` (added-only rows, each
with a typed quantity field and a remove button) below. State is a single
`Record<productId, number>` of quantities; an item is "in the order" purely by
having a quantity > 0 — there's no separate added/not-added flag.

The page shell (`.customer-shell` in `globals.css`) is already built for this
kind of layout: a fixed-viewport-height flex column with a pinned header, a
`flex-shrink: 0` search slot (`.order-search`) above a single scrolling region
(`.customer-list`, `flex: 1; overflow-y: auto`), and a pinned bottom action
bar. The filter input replacing the search combobox slots into the exact same
pinned position with no shell changes.

## Goals / Non-Goals

**Goals:**
- Every catalog product (~54 today) renders as a row with its own quantity
  field on load, sorted alphabetically by name (`localeCompare` with the
  `es` locale, computed in the component — not relying on catalog fetch
  order).
- A name filter, pinned above the scrolling list, narrows visible rows by the
  same accent/case-insensitive matching already used elsewhere
  (`normalizeForSearch` from `@pannico/shared`).
- Filtering only changes what's rendered; the `quantities` state (and thus
  what ends up in the submitted order) is untouched by the filter.
- A "clear filter" control resets the filter text in one action.
- No regression to what's outside this interaction: pinned action bar,
  running summary, brand/copy, a11y/touch-target rules, hidden category
  label — none of that changes.

**Non-Goals:**
- Virtualized/windowed list rendering. ~54 plain rows is not a scale problem;
  adding a virtualization library would be over-engineering for this PoC.
- Any change to `numeric-input-presentation` behavior — the quantity field
  keeps typed entry, select-on-focus, and integer coercion exactly as they
  are today.
- Any change to the back office's own product-picking flow — `ProductCombobox`
  keeps its search-to-add behavior there; only the customer page stops using
  it.

## Decisions

- **New component, not a `SelectedItems` prop toggle.** `SelectedItems`'s
  entire contract is "only render rows with qty > 0"; bolting an "always show
  all rows" mode onto it via a boolean would tangle two different filtering
  concerns (added-only vs. name-filtered-full-list) into one component. A new
  `CatalogList` component (customer-page-only, alongside `OrderForm.tsx`)
  owns the full-list-with-filter behavior; it reuses the same row markup,
  `useSelectAllOnFocus`, and CSS classes (`.item-fields`, `.item-field`,
  `.qty-input`) so it looks and behaves identically to the existing rows,
  just sourced differently. `SelectedItems` and `ProductCombobox` stay
  untouched for the back office.

- **Sort once, filter as a derived view.** `CatalogList` receives the raw
  `catalog: Product[]` and sorts it once (`useMemo`); the filter text
  produces a second derived `useMemo` over the sorted array. Quantities stay
  in `OrderForm`'s existing `Record<productId, number>` state, passed down
  unchanged — filtering never touches that state, which is what keeps a
  filtered-out row's quantity intact.

- **Per-row clear affordance only appears once a row has a quantity.** A
  full-catalog list has nothing to "remove" (every product's row always
  exists), so the old always-visible ✕ button would be a no-op on ~50 empty
  rows. Instead, the ✕ (same icon/position as `SelectedItems`, relabeled
  `aria-label="Vaciar cantidad de {name}"`) renders only when that row's
  quantity is > 0, and clears it to empty/0 rather than removing anything
  from view. This keeps the touch-target and accessible-name rules from
  `order-intake-presentation`'s existing "Controls are accessible and
  touch-friendly" requirement satisfied without inventing a new pattern.

- **Filter input reuses the `.order-search` slot**, not a new shell region.
  It's a plain `<input type="text">` (not the `ProductCombobox`'s
  `role="combobox"` listbox — there's no dropdown/selection here, just live
  filtering), plus a small "Limpiar" button beside it that's disabled when
  the filter is already empty. Because `.order-search` is already
  `flex-shrink: 0` above the single scrolling `.customer-list`, the filter
  reads as pinned with no shell/CSS restructuring — confirmed against the
  current `globals.css` layout rather than assumed.

- **Empty-filter-results state reuses the existing `emptyText` pattern** in
  spirit: when the filter matches zero products, the list shows a short
  "Sin resultados" message (distinct from the current "no products added
  yet" empty copy, which no longer applies — there's always at least one
  product unless the filter excludes all of them).

## Risks / Trade-offs

- **[Risk]** Rendering all ~54 rows (versus only added ones) makes the
  scrolling list taller by default and could feel like more visual noise on
  first load. → **Mitigation**: this is the explicit point of the change
  (scan-and-fill instead of search-then-wait); the filter exists precisely to
  cut the list down when it's a customer's second-plus order and they know
  what they want.
- **[Risk]** A customer filters the list, sets a quantity on a visible row,
  then clears the filter and loses track of what they'd already set on
  now-far-away rows. → **Mitigation**: out of scope for this change — the
  existing running summary ("N productos") already reflects the true
  selection count regardless of filter state, which is the existing
  mitigation for "losing track," and is unchanged here.
- **[Trade-off]** Losing the "product already added disappears from search"
  affordance means a customer can no longer tell at a glance, while filtering,
  which products they've already set a quantity for without scanning the
  quantity fields themselves. Accepted: the always-visible quantity value on
  each row (defaulting to empty, not a hidden state) is the replacement
  signal, and it's visible whether or not the filter is active.
