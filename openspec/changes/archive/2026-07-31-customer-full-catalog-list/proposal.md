## Why

The customer order form currently makes people find each product through a
search box, pick it from a dropdown, wait for it to land in a separate "added"
list, then type its quantity — one product at a time. With a catalog of ~54
products this is slow and easy to fumble on a phone, which is how this page is
overwhelmingly used. Showing the whole catalog up front, alphabetically
sorted, with a quantity field already on every row lets a customer scan and
fill in quantities directly, while a name filter at the top still helps narrow
a long list down.

## What Changes

- **Replace add-by-search with an always-visible, alphabetically sorted
  catalog list.** Every product in the catalog is listed on load, each with
  its own typed quantity field (unchanged: typed, not stepped, selects its
  whole value on focus — no change to `numeric-input-presentation`). A
  quantity of 0 (or empty) means the product isn't part of the order; any
  positive quantity means it is. There is no separate "added" list and no
  "already added" filtering out of a search dropdown — every product's row is
  always present.
- **Keep a name filter pinned above the list**, narrowing which rows are
  visible by substring match on the product name (accent/case-insensitive,
  same matching behavior as the search it replaces). Filtering only hides
  rows — it never clears a quantity already typed into a now-hidden row.
- **Add a "clear filter" control** next to the filter field to reset it back
  to showing the full list in one action.
- Everything else about the entry screen is unchanged: the running selection
  summary, the pinned confirm/WhatsApp action bar, brand identity, Spanish
  copy, accessibility/touch-target rules, and hiding the salado/dulce category
  label from the customer.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `order-intake-presentation`: replaces "Products are added by search and
  shown as an added-only list" with an always-visible, alphabetically sorted
  full-catalog list where every row has its own quantity field; adds a new
  requirement for the pinned name filter (with its clear control) that hides
  rows without discarding their quantities.

## Impact

- **Frontend only**, scoped to the customer order page:
  `packages/frontend/src/app/order/[token]/OrderForm.tsx` and its
  supporting components. `ProductCombobox` (search-to-add) is no longer used
  on this page — it's still used by the back-office order dialogs
  (unaffected; that's a separate flow governed by its own presentation spec).
  A new list component renders the full, sorted, filterable catalog with
  quantity fields, likely adapting `SelectedItems`'s row/quantity-field
  styling rather than introducing a new visual language.
- No backend, database, or shared-package changes — `catalog` is already
  fetched in full and passed to `OrderForm`; this is purely how it's
  presented and edited.
