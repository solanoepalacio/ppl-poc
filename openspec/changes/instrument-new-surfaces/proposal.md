## Why

The analytics taxonomy has not moved since the umami work landed, while the app
around it has. Producción real, the bloque stock control, the shortfall gate on
closing a bloque, the client directory, and the customer review gate all shipped
with no instrumentation at all — the `AnalyticsEvent` union's only change in that
whole stretch was *losing* a member, when the WhatsApp fallback was removed.

The gaps are not evenly costly. Two stand out:

- **Closing a bloque is the only irreversible data loss in the app.** A negative
  stock actual cannot carry forward, so closing discards it. A warning was added
  precisely because that is a real loss — and there is no record of how often it
  fires, or whether anybody has ever heeded it.
- **The customer review gate exists to be measured.** A pause was inserted before
  the first confirm to stop reflexive double-taps. Only the confirmations are
  counted, so the one number that says whether the pause works — how many
  customers see their summary and stop — is not collected.

## What Changes

- **The customer form reports its middle, not just its end.** The review gate
  going up, the summary being opened and closed, the filter being used, and
  confirmations that fail for reasons other than a dead link.
- **Bloque close reports all three outcomes.** The warning being shown, the
  manager backing out, and the close itself carrying whether it discarded a
  shortfall and how much.
- **Stock inicial and producción real report their saves,** producción real
  additionally separating entries appended from entries deleted — the save is
  non-idempotent by design, and that trade is only defensible if the duplicates
  it produces are observable.
- **The client directory reports its five mutations,** keeping retirement and
  deletion apart because one control performs both.
- **Login and logout stay uninstrumented,** and the docs now say so. Both are
  route handlers and `trackEvent` is client-only; reporting them means threading
  a marker through the redirect for a signal that back-office page views already
  approximate.
- **The unattended views stop reporting entirely.** `/production/*` and
  `/revisar-pedidos` sit on TV screens opened once and left for the day, which
  umami counts as one visit lasting twelve hours. `UmamiScript` no longer injects
  the tracker on those routes.
- **The docs record what the numbers mean,** not just that the events exist: the
  review-gate drop-off, the shortfall ratio, and the unattended-display caveat.

## Capabilities

### Modified Capabilities
- `analytics`: adds requirements for the newly instrumented surfaces (customer
  form interior, bloque close and stock, client directory) and states the
  privacy constraint the properties are chosen under. The existing requirements
  are untouched — every event already emitted keeps its name and properties.

## Impact

- **Frontend only, and additive.** No event is renamed or removed, so nothing
  already built on the umami side breaks.
- **No personal data leaves the app.** Properties are counts, flags, and
  quantities. Client names and phone numbers are never sent — `client_updated`
  reports *which field* changed, not to what.
- **The kiosk routes go dark, deliberately.** Excluding by route also drops the
  occasional visit a person makes to those screens from a desk. Accepted: they
  are read-only views with nothing to measure that would justify skewing session
  duration and bounce rate everywhere else. Filtering after the fact was the
  alternative and does not work — umami's dashboard filters run on its own
  built-in dimensions, so an event property marking kiosk traffic makes it
  visible without making it subtractable. The way back, if those views ever need
  measuring, is a per-device opt-out on the TVs (`umami.disabled` in
  `localStorage`) with the route exclusion lifted.
- **`UmamiScript` becomes a client component** so it can read the path. The env
  gating is unchanged — both variables are inlined at build time — and the root
  layout stays a server component.
