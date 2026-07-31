## Context

`ProductionView.tsx` is an `async` Server Component: it awaits
`getProductionTotals(undefined, category)` and renders a table. There is no
`'use client'` anywhere under `(backoffice)/production/`, no interval, and no
subscription — so the totals are whatever they were at render time, forever.

The rest of the back office already has an established pattern for keeping
server-rendered data in sync: a client island performs an action, then calls
`startTransition(() => router.refresh())` to re-run the Server Component and
reconcile the DOM (`CloseSlotButton`, `OrderActions`, `ExistenceEditor`,
`CreateOrderModal` all do exactly this). This change reuses that same
mechanism, with a timer as the trigger instead of a user action.

Relevant facts confirmed in the codebase, not assumed:
- `lib/api.ts` fetches with `cache: 'no-store'`, and the production routes build
  as `ƒ (Dynamic) — server-rendered on demand`, so a re-render genuinely reads
  through to the backend. There is no caching layer to defeat.
- `GET /orders/production` already resolves the open bloque per request when no
  bloque is specified, which is what these views pass.

## Goals / Non-Goals

**Goals:**
- Both production views pick up newly arrived orders on their own, within two
  minutes, with nobody touching the screen.
- A list too long for the screen reveals itself over time, so every product is
  seen without anyone touching the display.
- The refresh is visually quiet: numbers change in place, scroll position and
  the rest of the page stay put, no spinner or layout flash — this is a screen
  people glance at from across a room, so any twitch is a regression.
- A hidden/backgrounded tab stops polling, and resumes with an immediate
  refresh when it becomes visible, so a tab left open overnight isn't hammering
  the API and a returning viewer never reads stale numbers.

**Non-Goals:**
- Real-time push (SSE/WebSockets). A 30-second poll is what this needs; a push
  channel would mean new backend surface for a screen whose data changes a few
  times an hour.
- Any auto-refresh on the orders view or elsewhere in the back office.
- A visible "last updated" timestamp or refresh indicator. Deliberately out of
  scope for now: it's the kind of thing that reads as clutter on a wall
  display, and nothing in the request asked for it.
- A configurable interval or scroll speed. Both are hardcoded; making them
  settings is speculative generality for a PoC.
- Pausing the scroll when someone scrolls by hand. Nobody touches this display in
  normal use; if that turns out to be wrong it is a small, separate change.

## Decisions

- **A client island calling `router.refresh()` on an interval — not a
  client-side `fetch` of the totals.** `router.refresh()` re-runs the existing
  Server Component and patches the result in, so the table's rendering logic
  stays in exactly one place and there is no client-side copy of the totals to
  keep in sync. A client-side fetch would mean duplicating the table markup and
  the demand/existencia/net presentation into a client component — more code
  and two ways for the same screen to render.

- **Rejected: `export const revalidate = 30` on the page.** This is the
  obvious-looking Next.js knob and it does not solve this problem: it governs
  server-side caching of the route, not the browser. Nothing tells an
  already-open page to re-render, so a screen left open would still show its
  original numbers indefinitely. The trigger has to come from the client.

- **The island renders nothing.** It's a behavior-only component (returns
  `null`) mounted by `ProductionView`, so it adds no markup to the table and
  can't affect layout. `ProductionView` stays a Server Component; only the
  island is `'use client'`.

- **Wrap the refresh in `startTransition`**, matching the existing islands.
  This keeps the update non-blocking and lets React swap the new content in
  without tearing down what's on screen — which is what delivers the "numbers
  change in place, no flash" requirement rather than any CSS work.

- **Pause on `document.visibilityState === 'hidden'`, refresh on becoming
  visible.** Both halves matter: pausing stops a forgotten tab from polling
  forever, and the immediate refresh on return means someone who switches back
  to the tab isn't looking at numbers up to two minutes old while waiting for
  the next tick.

- **Clean up on unmount** (clear the interval, remove the `visibilitychange`
  listener), so navigating between the two production views doesn't leave a
  stale timer behind that keeps refreshing a page nobody is on.

- **Two minutes for the refresh, not thirty seconds.** The view now spends most
  of its time moving, and a refresh landing mid-scroll changes content under the
  reader's eye. Orders do not arrive fast enough to make a tighter interval worth
  that. It also cuts the request volume fourfold on a screen that runs all day.

- **A separate island for the scroll, not folded into the refresh one.** They are
  different concerns on different clocks, and the refresh island renders nothing
  and touches no DOM while the scroll one drives `.bo-main` directly. Keeping
  them apart means neither has to know about the other's timing.

- **Animate with `requestAnimationFrame` at a fixed pixels-per-second speed, not
  `scrollTo({behavior:'smooth'})`.** The native smooth scroll picks its own
  duration, which for a long list is a fast swoop — the opposite of the subtle
  movement this needs. A fixed speed means the movement looks identical whether
  the list is slightly or greatly taller than the screen; only the duration
  changes.

- **Scroll `.bo-main`, the shell's scrolling column** — confirmed as the element
  that actually overflows (`overflow-y: auto`), rather than the window, which
  does not scroll here because the shell is `position: fixed`. This was checked
  in the DOM, not assumed; an earlier verification of this same view was
  initially wrong for exactly this reason.

- **Track the intended position in a local float, not by reading back
  `el.scrollTop`.** Found the hard way on the actual TV: some engines store
  `scrollTop` as an integer, and at a subtle speed one frame advances well under
  a pixel — so a read-modify-write loop has its step truncated away every frame
  and never moves from a standstill. The symptom was diagnostic: scrolling *up*
  from a position someone had scrolled to by hand worked (the step lands on a
  different integer), while scrolling *down* from the top was stuck forever.
  Accumulating our own float and writing it out means the rounding only affects
  what is painted, not the progress. The final frame also writes the exact target,
  so a truncating engine cannot leave the view a pixel short of the end.

- **Re-measure the scroll extent on every frame.** A refresh can land mid-cycle
  and change the content height; reading the target each frame means the
  animation adapts instead of scrolling to a stale position.

- **Respect `prefers-reduced-motion` by jumping instead of gliding**, keeping the
  same dwell times. Switching the feature off entirely would defeat its purpose
  on the display it exists for, but the gliding motion is exactly what the
  preference is about.

## Risks / Trade-offs

- **[Risk]** A refresh landing while someone is mid-glance changes numbers
  under their eyes with no indication anything happened, so a person could
  misread a value they were part-way through reading. → **Mitigation**:
  accepted for now — the alternative (a visible refresh indicator) is
  explicitly a non-goal above, and the risk is inherent to any auto-refreshing
  display. Worth revisiting if the bakery reports confusion.
- **[Risk]** `router.refresh()` on an interval in a Server Component tree could
  interact badly with an in-flight navigation or a pending transition.
  → **Mitigation**: the polling views are read-only with no forms or pending
  mutations of their own, so there is no user input that a refresh could
  discard; and this must be confirmed by driving the page, not by reasoning
  about it.
- **[Risk]** An automatic scroll fights anyone who does try to scroll by hand,
  which is disorienting. → **Mitigation**: accepted for now (see non-goals) — the
  display is not interactive in normal use. Naming it so it is a known
  limitation rather than a surprise.
- **[Trade-off]** Up to two minutes of staleness now, rather than 30 seconds. Anyone who
  needs the number *right now* still has reload available, exactly as today.
- **[Trade-off]** Two API requests per minute per open view, plus one on every
  tab re-focus. Negligible here (single bakery, local network, SQLite), but it
  is strictly more load than the current zero.
