## Why

The production views (**Producción salados** / **Producción dulces**) are
read-only Server Components that fetch their totals once, when the page loads,
and never again. In the bakery these views are meant to sit open on a screen in
the production area while orders keep arriving, so the numbers on display go
stale silently — someone has to remember to reload to see the real quantities
to produce. Nobody watching the screen can tell whether what they're reading is
current.

## What Changes

- **The production views re-fetch their totals every 30 seconds** while the
  page is open, so newly arrived orders show up without anyone reloading. Both
  line views get this, since they share the same view component.
- The refresh is silent and non-destructive: it replaces the numbers in place,
  never resets scroll position, and shows no spinner or flash that would make
  the screen twitch on a wall display.
- Polling **pauses while the tab/window is hidden** and resumes (with an
  immediate refresh) when it becomes visible again, so a backgrounded tab
  doesn't poll the API pointlessly for hours and a returning viewer sees
  current numbers right away.
- The orders view and every other back-office view are unchanged — this is
  scoped to the two production views only.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `production-totals`: adds a requirement that the production views refresh
  their totals periodically on their own while open, on top of the existing
  load-time behavior (which is unchanged — the views still show the open
  bloque's current totals whenever they load).

## Impact

- **Frontend only.** A new small client island under
  `packages/frontend/src/app/(backoffice)/production/` that calls
  `router.refresh()` on an interval; `ProductionView.tsx` renders it. No change
  to how the totals themselves are fetched or displayed.
- No backend changes: `GET /orders/production` already returns current totals
  per request and `lib/api.ts` fetches with `cache: 'no-store'`, so a refresh
  reads through to the database with no caching to defeat.
- Slightly more API traffic: two requests per minute per open production view.
  Negligible for a single bakery on a local network, and the visibility pause
  keeps forgotten tabs from contributing.
