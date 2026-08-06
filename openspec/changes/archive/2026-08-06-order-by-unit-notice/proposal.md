## Why

Customers order by the package — a tray of medialunas, a bag of facturas —
because that is how they buy bread everywhere else. The form takes quantities in
units, so "3" means three medialunas, not three dozen. Nothing on screen says
so, and the mistake is invisible until the order is baked: the bakery either
produces a fraction of what was wanted or ten times it, and finds out at pickup.

## What Changes

- **A notice in the customer page's header**, above the catalog, reading
  **IMPORTANTE: LOS PEDIDOS SE TOMAN POR UNIDAD, NO POR PAQUETE**, in red so it
  is read before the catalog is.
- Shown on the **order entry screen only**. The confirmation and invalid-link
  states have no quantities to misread, and the brand header is shared across
  all three.

## Capabilities

### Modified Capabilities
- `order-intake-presentation`: a new requirement for the notice; the compact-header
  requirement is amended, since the header now carries something besides brand and
  title; and the Spanish-copy requirement, which enumerates the strings.

## Impact

- **Frontend only:** `OrderForm.tsx` and `globals.css`. No API, no data change.
- **It costs viewport height on a phone**, which the compact-header requirement
  exists to protect. Accepted deliberately: a line of text is cheaper than a
  remade order, and it is one line, not a banner.
- **Placed in `OrderForm`, not `BrandHeader`.** The brand bar renders on the
  success and invalid-link screens too, where the notice would be noise.
- **The notice does not meet the WCAG AA contrast bar this capability sets.**
  `#ff4d11` measures **3.32:1** against white; AA wants 4.5:1 for text this size.
  It is on white rather than a tint precisely because every darker background
  costs it more. This is a chosen exception, not an oversight: the colour was
  specified for visibility. `#d63705` measures 4.76:1 and reads as the same red
  at a glance, if the bar matters more than the exact hex.
