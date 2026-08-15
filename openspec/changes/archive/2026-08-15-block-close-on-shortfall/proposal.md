## Why

Closing a bloque with a product in shortfall discards it. That was a deliberate
call — a stock inicial is a counted quantity and cannot be negative — and the
close warning exists so the loss is chosen rather than discovered. In practice
the choice is the wrong one to offer: the shortfall means the bakery owes units
it has not baked, and confirming past the warning is how that debt gets thrown
away with a click, silently and irreversibly.

Making it a hard stop turns the warning into what it should always have been: not
"are you sure you want to lose this", but "there is still work to do".

## What Changes

- **A bloque with any product in shortfall cannot be closed.** The attempt is
  rejected and the bloque stays open.
- **The rejection is enforced by the backend**, not only by the control that
  offers it. A guard the UI alone applies is a guard the next caller does not get.
- **The dialog stays put and explains itself.** Where it used to offer *Cerrar
  igual*, it now says the bloque cannot be closed and lists the products that are
  short, so the manager knows exactly what to produce to unblock it.

## Capabilities

### Modified Capabilities
- `production-slots`: the shortfall warning becomes a prohibition — removed and
  re-added, since its scenarios are named after confirming and proceeding.

## Impact

- **The way out is to produce.** Recording the missing production raises the
  stock actual to zero or above and the close goes through. Editing the stock
  inicial does the same, which is the escape hatch when the shortfall is a
  counting error rather than real.
- **A bloque can now be un-closable**, and that is the point. The alternative is
  a bloque that closes while owing units nobody will ever bake.
- **The carry requirement keeps its clamp** untouched: nothing negative is
  written as a stock inicial. It simply becomes unreachable through closing,
  since a bloque with a negative cannot close at all.
- **No schema change**, and the close remains a single transaction.
- **It invalidates analytics another developer had just added.** Their three
  `slot_close*` events were built to measure the escape hatch — `shown` against
  `cancelled` to see whether the warning changed anybody's mind, and
  `slot_closed{hadShortfall:true}` to count the times it did not. With the escape
  gone, one of those can never fire and another stops distinguishing anything.
  Replaced by a single `slot_close_blocked`, which measures the thing that now
  exists: how often the refusal stops a close, and how deep the hole was. Worth
  raising with them — the instrumentation may have been there precisely to decide
  whether to keep the escape, and this answers the question by removing it.
