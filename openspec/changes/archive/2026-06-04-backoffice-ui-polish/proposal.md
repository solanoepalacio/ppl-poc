## Why

The back-office orders and production views carry small presentation flaws that
add visual noise and reduce clarity: an unlabelled status dot, a stray separator
under each order card's actions, view titles that merely repeat the active tab,
and an explanatory paragraph on the production view that states the obvious. None
of these change behavior, but together they make the back office look unfinished.

## What Changes

- Replace the colored status **dot** in the order status control with a plain
  **`Estado`** label placed before the status selector, so the control reads
  clearly instead of relying on a color cue.
- Remove the separator line shown at the bottom of each order card (under the
  **Editar artículos** / **Eliminar** buttons), caused by the global `.row`
  bottom border applied to the actions row.
- Remove the redundant per-view page titles — `Órdenes` on the orders view and
  `Producción diaria` on the production view — since the active tab in the
  persistent navigation already names the current view.
- Remove the explanatory paragraph on the production view (`Artículos a producir
  el … (órdenes pendientes, emitidas y finalizadas).`), which restates what the
  list already conveys.

## Capabilities

### New Capabilities
- `back-office-presentation`: Presentation-only requirements for the back-office
  orders and production views — how the status control is labelled, that order
  cards carry no internal separators, and that views omit titles and
  explanatory copy already conveyed by the navigation and the data itself.

### Modified Capabilities
<!-- None. The affected specs (order-management, production-totals,
     back-office-navigation) define behavior and navigation, not visual
     presentation; these polish items are not currently specified there. -->

## Impact

- `packages/frontend/src/app/(backoffice)/orders/OrderStatusControl.tsx` — swap
  the status dot for an `Estado` label.
- `packages/frontend/src/app/(backoffice)/orders/page.tsx` — drop the `Órdenes`
  heading (and the redundant inline border on the header row).
- `packages/frontend/src/app/(backoffice)/orders/OrderActions.tsx` /
  `packages/frontend/src/app/globals.css` — ensure the actions row shows no
  bottom separator.
- `packages/frontend/src/app/(backoffice)/production/page.tsx` — drop the
  `Producción diaria` heading and the explanatory paragraph.
- No API, data, or behavior changes.
