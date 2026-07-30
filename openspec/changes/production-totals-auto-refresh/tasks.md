## 1. Polling island

- [x] 1.1 Create
  `packages/frontend/src/app/(backoffice)/production/AutoRefresh.tsx` as a
  `'use client'` component that renders `null` and, on mount, starts a
  30-second interval calling `startTransition(() => router.refresh())` —
  following the same client-island-refreshes-the-server-tree pattern as
  `CloseSlotButton` / `OrderActions`.
- [x] 1.2 Skip the tick while `document.visibilityState === 'hidden'`, and add a
  `visibilitychange` listener that refreshes immediately when the view becomes
  visible again (rather than waiting for the next interval).
- [x] 1.3 Clear the interval and remove the `visibilitychange` listener on
  unmount, so navigating away from a production view leaves no timer running.

## 2. Mount it on the production views

- [x] 2.1 Render `<AutoRefresh />` from `ProductionView.tsx` so both
  **Producción salados** and **Producción dulces** get it. `ProductionView`
  stays a Server Component; only the island is client-side. Nothing else about
  the view changes.

## 3. Verification

- [x] 3.1 Typecheck the frontend (`yarn workspace @pannico/frontend run lint`).
- [x] 3.2 Drive it: open a production view, create an order containing a product
  of that view's category from the API, and confirm the view's figures update on
  their own within 30 seconds with no interaction.
- [x] 3.3 Drive it: confirm the refresh is quiet — scroll the table, let a
  refresh land, and confirm the scroll position holds and no spinner or flash
  appears.
- [x] 3.4 Drive it: confirm polling stops while the page is hidden and that
  becoming visible again triggers an immediate refresh (assert on the actual
  requests the page makes, not just on the rendered numbers).
- [x] 3.5 Drive it: navigate from a production view to another view and confirm
  no further production requests are made afterward.
- [x] 3.6 `openspec validate production-totals-auto-refresh --strict`, then
  dry-run the archive against a throwaway copy of `openspec/` to confirm the
  delta applies cleanly.
