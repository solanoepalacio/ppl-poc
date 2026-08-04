## Why

The summary exists so the customer can check their order before committing, but
two things stop it from doing that job.

**It is sorted alphabetically.** The customer works down a long catalog typing
quantities; the summary then re-shuffles those picks into an order that has
nothing to do with what they just did. Checking a list means matching it against
your memory of what you chose, and what you remember is the sequence — *"first
the medialunas, then the facturas, then I went back for pan"*. Alphabetical order
throws that away and makes the customer read every row to find the one they want
to verify.

**Nothing makes them look.** The summary is collapsed by default and opening it
is optional, so the fastest path through the form is still to scroll to the
bottom and confirm without ever seeing what is on the order. The check we built
is the one step a customer in a hurry skips, and a wrong order discovered at
pickup costs the bakery a remake.

## What Changes

- **Order the summary by when each product was added**, not alphabetically. The
  list reads back as the sequence the customer performed. Clearing a product and
  typing a quantity again puts it at the end, because that is a new entry.
- **Gate the first confirm behind a review.** Pressing **Confirmar pedido** the
  first time does not submit: it expands the summary, shows the notice **Por
  favor revise su pedido antes de confirmarlo**, relabels the button **Revisar
  pedido...5** and disables it for 5 seconds, counting the seconds down on the
  label. When the summary is already open only the notice is added — there is
  nothing to expand.
- **After the 5 seconds the button returns to Confirmar pedido, enabled**, and
  the next press submits exactly as it does today. The pause is a speed bump, not
  a second confirmation dialog.

## Capabilities

### Modified Capabilities
- `order-intake-presentation`: the summary requirement changes the summary's sort
  from alphabetical to order-of-entry; a new requirement covers the review gate;
  and the Spanish-copy requirement, which enumerates the customer-facing strings,
  gains the notice and the review label.

## Impact

- **Frontend only:** `OrderForm.tsx` (entry order, the gate, the notice) and
  `globals.css` (the notice's styling). No backend, no API, no data model change —
  the submitted payload is identical and its item order was never significant.
- **The catalog list stays alphabetical.** Only the summary re-sorts; the list
  the customer scrolls is a reference and has to be findable by name.
- **Every customer now pays 5 seconds** on their first confirm, including the one
  who already opened the summary and read it. That is the cost of the guarantee;
  the alternative — gating only those who never opened it — rewards opening the
  panel without reading it and is not a check at all.
- **The gate fires once per form session**, not on every press. Once reviewed the
  form behaves as before, and since the gate leaves the summary open, later
  quantity changes are visible in it without re-arming.
- **The pause is legible rather than dead.** The button counts the seconds down on
  its own label, so an unclickable control reads as a wait with a known end
  instead of a fault. Without it the customer has only the appearing list and
  notice to infer why the button stopped responding.
