## Why

The production views (**Producción salados** / **Producción dulces**) are
read-only Server Components that fetch their totals once, when the page loads,
and never again. In the bakery these views are meant to sit open on a screen in
the production area while orders keep arriving, so the numbers on display go
stale silently — someone has to remember to reload to see the real quantities
to produce. Nobody watching the screen can tell whether what they're reading is
current.

## What Changes

- **The production views re-fetch their totals every two minutes** while the
  page is open, so newly arrived orders show up without anyone reloading. Both
  line views get this, since they share the same view component. Two minutes
  rather than something tighter because the view now spends most of its time
  scrolling itself: a refresh that lands mid-scroll is a change under the
  reader's eye, and orders do not arrive fast enough to justify the churn.
- **A long list scrolls itself.** When the content does not fit on the screen,
  the view holds still for 15 seconds, scrolls gradually to the bottom, holds
  15 seconds, scrolls gradually back to the top, holds again, and repeats — so
  every product becomes visible on a display nobody is touching. A list that
  fits does not move at all.
- The refresh is silent and non-destructive: it replaces the numbers in place,
  never resets scroll position, and shows no spinner or flash that would make
  the screen twitch on a wall display.
- Both behaviours **pause while the tab/window is hidden**. Polling resumes with
  an immediate refresh when the view becomes visible again, so a backgrounded tab
  doesn't poll the API pointlessly for hours and a returning viewer sees current
  numbers right away.
- The orders view and every other back-office view are unchanged — this is
  scoped to the two production views only.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `production-totals`: adds requirements that the production views refresh their
  totals periodically on their own while open, and that they scroll through a
  list too long to fit — both on top of the existing load-time behaviour, which
  is unchanged.

## Impact

- **Frontend only.** Two small client islands under
  `packages/frontend/src/app/(backoffice)/production/`: one calling
  `router.refresh()` on an interval, one driving the scroll cycle.
  `ProductionView.tsx` renders both. No change to how the totals themselves are
  fetched or displayed.
- No backend changes: `GET /orders/production` already returns current totals
  per request and `lib/api.ts` fetches with `cache: 'no-store'`, so a refresh
  reads through to the database with no caching to defeat.
- Slightly more API traffic: one request every two minutes per open production
  view — less than the polling this replaces. Negligible for a single bakery on a
  local network, and the visibility pause keeps forgotten tabs from
  contributing.
