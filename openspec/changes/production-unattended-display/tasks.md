## 1. Polling island

- [x] 1.1 Create
  `packages/frontend/src/app/(backoffice)/production/AutoRefresh.tsx` as a
  `'use client'` component that renders `null` and, on mount, starts an
  interval calling `startTransition(() => router.refresh())` —
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
  their own within the refresh interval with no interaction.
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

## 4. Slow the refresh to two minutes

- [x] 4.1 Change `AutoRefresh`'s interval constant from 30 seconds to two
  minutes, and update its doc comment (which names the interval) to match.

## 5. Self-scrolling island

- [x] 5.1 Create `AutoScroll.tsx` as a `'use client'` component that renders
  `null` and drives `.bo-main` — the shell's scrolling column, confirmed in the
  DOM as the element that actually overflows (the window does not scroll here,
  the shell is `position: fixed`).
- [x] 5.2 Do nothing at all while the content fits: no timers, no movement.
- [x] 5.3 Run the cycle: hold 15s, glide to the bottom, hold 15s, glide back to
  the top, hold 15s, repeat.
- [x] 5.4 Animate with `requestAnimationFrame` at a fixed pixels-per-second
  speed rather than `scrollTo({behavior:'smooth'})`, so the movement is subtle
  and looks the same regardless of list length. Re-read the scroll extent each
  frame so a refresh landing mid-cycle cannot leave it scrolling to a stale
  target.
- [x] 5.5 With `prefers-reduced-motion`, jump instead of gliding, keeping the
  same dwell times.
- [x] 5.6 Pause while the tab is hidden, and clean up the loop and listeners on
  unmount so navigating away leaves nothing running.
- [x] 5.7 Render `<AutoScroll />` from `ProductionView.tsx` alongside
  `<AutoRefresh />`.

## 6. Verification of the new behaviour

- [x] 6.1 Frontend typecheck.
- [x] 6.2 Drive it with a short list: confirm the view never scrolls itself.
- [x] 6.3 Drive it with a list taller than the screen: confirm it holds, then
  reaches the bottom on its own, holds, and returns to the top — measuring the
  scroll position over time rather than eyeballing it.
- [x] 6.4 Drive it: confirm the movement is progressive (intermediate scroll
  positions are observed), not a single jump.
- [x] 6.5 Drive it: confirm scrolling stops while the tab is hidden and resumes
  when it is visible again.
- [x] 6.6 Drive it: navigate away and confirm no further scrolling or refresh
  requests happen.
- [x] 6.7 Drive it: confirm the refresh now happens on the two-minute interval,
  by counting the actual requests the page makes over a window longer than the
  old interval.
- [x] 6.8 `openspec validate production-unattended-display --strict`, then
  dry-run the archive against a throwaway copy of `openspec/`, in both orders
  relative to `production-views-two-column-layout`.

## 7. Fix: sub-pixel steps on integer-only scroll engines

Found on the TV: the view scrolled up but never down. Reproduced locally by
emulating an engine whose `scrollTop` accepts only integers — the sub-pixel
per-frame step was truncated away, so the animation could not leave 0.

- [x] 7.1 `AutoScroll`: accumulate the intended position in a local float and
  write it to `scrollTop` each frame, instead of reading `scrollTop` back as the
  animation's state. Write the exact target on the final frame.
- [x] 7.2 Reproduce the bug before fixing it, by patching `Element.prototype`'s
  `scrollTop` setter to truncate — confirming the down direction sticks at 0
  while the up direction works, exactly as reported.
- [x] 7.3 Verify the fix under that same emulation, and confirm no regression in
  normal Chrome (both should produce the same motion).
