## 1. Taxonomy

- [x] 1.1 `lib/analytics.ts`: extend the `AnalyticsEvent` union with the fourteen
  new events, grouped by the surface they come from. No existing member renamed
  or removed, so nothing already built on the umami side breaks.

## 2. Customer order form

- [x] 2.1 `OrderForm.tsx`: emit `order_review_raised` in `startReview`, carrying
  `summaryWasOpen` — a customer who had already opened the summary got only the
  pause, and that is a different experience to measure.
- [x] 2.2 Route both summary controls through a `toggleSummary` helper emitting
  `order_summary_toggled`, so opening and closing are comparable rather than one
  being inferred from the other.
- [x] 2.3 Emit `order_filter_used` once per visit, guarded by a ref, on the first
  keystroke that leaves the field non-empty. Per-keystroke would answer a
  question nobody asked and swamp the event volume.
- [x] 2.4 Emit `order_confirm_failed` from `handleActionError`, on the branch
  *after* the 404 early-return so an invalid link is not counted twice.

## 3. Bloque

- [x] 3.1 `CloseSlotButton.tsx`: hold the pending shortfall in a ref alongside the
  state. Three entry points report the outcome — the two buttons and the dialog's
  own `onClose`, which also covers escape and the backdrop — and each prompt must
  produce exactly one outcome event.
- [x] 3.2 Emit `slot_close_shortfall_shown` when the warning goes up,
  `slot_close_cancelled` on dismissal, and `slot_closed` on success with
  `hadShortfall`.
- [x] 3.3 Consume the ref only on a *successful* close, so a failed attempt the
  manager retries still reports what is being discarded.
- [x] 3.4 `ExistenceEditor.tsx`: emit `stock_saved`, taking `shortfallCount` off
  the rows rather than the payload — a stock actual is derived and never sent.
- [x] 3.5 `ProducedEditor.tsx`: emit `produced_saved` via a `producedProps` helper
  that diffs the submitted entry ids against the server's to derive `added` and
  `removed`.

## 4. Client directory

- [x] 4.1 `ClientDirectory.tsx`: emit `client_created`, `client_updated`,
  `client_reactivated`.
- [x] 4.2 Split removal into `client_deleted` / `client_deactivated` on the same
  `orderCount === 0` test the server uses to choose between them.
- [x] 4.3 Derive `client_updated`'s flags by comparing the draft against the
  client from props, sending which fields moved and never their contents.

## 5. Unattended views

- [x] 5.1 `UmamiScript.tsx`: make it a client component (`usePathname`) and return
  null on `/production/*` and `/revisar-pedidos`. The env gating is untouched —
  `NODE_ENV` and the `NEXT_PUBLIC_*` vars are inlined at build time — and the root
  layout stays a server component.
- [x] 5.2 Match the prefix on a path boundary (`=== prefix` or `startsWith(prefix
  + '/')`), so a future `/production-costos` is not swept up by the
  `/production` entry.

## 6. Documentation

- [x] 6.1 `docs/analytics-events.md`: split the table by surface, add all fourteen
  events, and state the no-personal-data rule the properties follow.
- [x] 6.2 Fix the stale source column — `order_link_generated` and
  `order_link_copied` moved to `GenerateLinkModal.tsx` when link generation was
  split out of `CreateOrderModal.tsx`.
- [x] 6.3 Correct the page-views section: it listed three routes, and the set is
  now the four that load the script at all — the customer form, `/login`,
  `/orders`, `/clientes`.
- [x] 6.4 Add a *Not instrumented* section recording login/logout as a deliberate
  omission with its reason, plus sidebar navigation and the auto-refresh ticks.
- [x] 6.5 Add the *Unattended displays* section: what is excluded, that the
  exclusion is by route and so drops human visits to those screens too, that a
  client-side navigation *into* one still counts, and why filtering afterwards
  was not the answer.

## 7. Verify

- [x] 7.1 Frontend `lint` (`tsc --noEmit`).
- [x] 7.2 Backend `lint` and `test` — untouched by this change, run to confirm so.
- [x] 7.3 `openspec validate --all`.
- [ ] 7.4 Drive a production build with a reachable umami and confirm each event
  arrives with the properties documented. Not doable from `next dev`:
  `UmamiScript` injects only when `NODE_ENV=production`.
- [ ] 7.5 Specifically confirm the close-bloque prompt emits exactly one outcome
  event per prompt across all four dismissal paths (cancel button, dialog close
  control, escape, backdrop) and that a failed-then-retried close still reports
  its shortfall.
