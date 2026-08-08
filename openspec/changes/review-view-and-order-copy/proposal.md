## Why

Two unrelated adjustments, batched because they are small.

**Revisar Pedidos scrolls itself.** It was given the production views' auto-scroll
on the assumption it would be read like them — glanced at, unattended. It is not:
the people packing look for one client, and a list that moves under them while
they read is worse than one they scroll themselves.

**The customer form asks for a review too late.** The notice to check the order
appears only after the first confirm is pressed. By then the customer has decided.
Putting it on the summary, in the same red the header uses, means it is read while
the order is still being built. And the five-second pause that follows is longer
than it needs to be now that the notice is not the first they hear of it.

## What Changes

- **Drop the auto-scroll from Revisar Pedidos.** Auto-refresh stays: keeping the
  bloque current costs the reader nothing, moving the page under them does.
- **A red notice on the order summary**, next to *Resumen de su pedido*, reading
  *Por favor revise su pedido antes de confirmarlo* — styled like the by-unit
  notice in the header rather than as a passing alert.
- **The review pause drops from 5 seconds to 3.**

## Capabilities

### Modified Capabilities
- `order-review-presentation`: the unattended requirement keeps the refresh and
  loses the cycling.
- `order-intake-presentation`: the review notice becomes part of the summary, and
  the pause is shortened.

## Impact

- **Frontend only**, no API and no data change.
- **A long directory now needs scrolling by hand.** That is the trade: this view
  is looked *up* in, and someone reading a client's row does not want the page
  moving. The production views keep their cycling, where nobody is standing at
  the screen.
- **`AutoScroll` keeps its only remaining callers**, the two production views. It
  stays where it is rather than moving back, since it is no longer view-specific.
