## Context

Four presentation flaws in the back-office orders and production views, all
cosmetic and confined to the frontend. The relevant pieces today:

- `OrderStatusControl.tsx` renders `<span class="status-dot status-*">` before the
  `<select>`, styled by `.status-dot` in `globals.css`.
- `orders/page.tsx` renders an `<h1>Órdenes</h1>` and a header `.row` that carries
  both a global `.row` bottom border and a redundant inline `borderBottom`.
- The card's action buttons in `OrderActions.tsx` are wrapped in a `.row`, and the
  global `.row` rule (`globals.css:100`) applies `border-bottom: 1px solid var(--line)`
  to every `.row` — that bottom border is the stray separator under the actions.
- `production/page.tsx` renders an `<h1>Producción diaria</h1>` and an explanatory
  `<p class="muted">Artículos a producir …</p>`.

## Goals / Non-Goals

**Goals:**
- Label the status control with `Estado` and drop the color dot.
- Remove the separator beneath each card's action buttons.
- Remove the redundant per-view titles on the orders and production views.
- Remove the production view's explanatory paragraph.

**Non-Goals:**
- No change to order/production behavior, data, or API.
- No redesign of the navigation, cards, or status model.
- No change to the customer-facing order page.

## Decisions

- **Status label over dot.** Replace `.status-dot` with a `<span>Estado</span>`
  label before the `<select>` inside `.status-select`. Remove the now-unused
  `.status-dot` rule (and the per-status color classes if they exist only for the
  dot) from `globals.css` to avoid dead CSS. The `aria-label="Estado de la orden"`
  on the select stays for screen readers.
- **Separator removal scoped to the actions row, not global `.row`.** The global
  `.row` bottom border is intentional elsewhere (e.g. the card header row). Rather
  than strip it globally, give the `OrderActions` button row a modifier that
  removes its bottom border (e.g. a `row--no-divider` class or dropping `.row` in
  favor of a borderless flex row). Also remove the redundant inline `borderBottom`
  on the orders header row in `page.tsx`, deferring to the global `.row` border
  there. This keeps the header divider while clearing the trailing one.
- **Titles removed outright.** Delete the `<h1>` from both `orders/page.tsx` and
  `production/page.tsx`; the active nav tab is the view indicator per
  `back-office-navigation`.
- **Explanatory paragraph removed; empty state kept.** Delete the
  `Artículos a producir …` paragraph from `production/page.tsx`; keep the
  `Nada que producir …` empty-state message.

## Risks / Trade-offs

- Removing the dot removes a color cue, but the labelled selector states the status
  in words (`pendiente`, `emitida`, …), which is clearer — the intent of the change.
- Adding a separator modifier rather than editing global `.row` is slightly more CSS
  but avoids regressing the header divider and any other `.row` usages.
