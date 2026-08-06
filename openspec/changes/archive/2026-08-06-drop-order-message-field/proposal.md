## Why

The **Mensaje del pedido (opcional)** textarea sits pinned at the foot of the
Agregar pedido modal, taking a fixed slice of a dialog whose scarce resource is
height — the added-products list is the only region that scrolls, and every
pixel the message field occupies is a pixel that list does not get.

What it buys is nothing the back office can use. The message is **write-only**:
nothing in the app ever reads it back. It is not on the orders table, not in the
expanded order detail, not in any export. Its stated purpose — captured in its
own placeholder — is to collect training data for an order-taking agent that does
not exist yet, from a manager who has to paste it by hand while transcribing an
order they are already in a hurry to record.

## What Changes

- **Remove the message field from the Agregar pedido modal.** The modal drops to
  two regions: the client selector pinned at the top and the added-products list
  (with its pinned search) filling the rest.
- **Keep the API and the stored data exactly as they are.** `POST /orders` still
  accepts an optional `message` and still persists it; the column, the DTO and
  the messages already stored on past orders are untouched. What goes is the
  manager-facing way of supplying one.
- **Drop the now-dead UI plumbing:** `Modal`'s `belowBody` region, which nothing
  else uses, and the `.modal-below` / `.modal-message` styles that existed only
  for this field.

## Capabilities

### Modified Capabilities
- `order-create-presentation`: the three-region layout requirement is replaced by
  a two-region one (its title and half its scenarios name the message field), and
  the contents requirement stops naming the optional message.
- `order-management`: the manual-creation requirement stops claiming the back
  office collects a message, while keeping the API's optional `message` contract
  and both of its persistence scenarios intact.

## Impact

- **Frontend only:** `CreateOrderModal.tsx`, `Modal.tsx`, `globals.css`. No
  backend change, no schema change, no migration.
- **Ordering dependency:** this change and `list-dialog-products-by-entry` both
  modify *Order contents are entered by searching and adding products*. The delta
  here is written against the baseline **after** that change is archived and
  includes its entry-order paragraph. **Archive `list-dialog-products-by-entry`
  first**; archiving this one first would leave the other's delta re-adding the
  optional-message wording.
- **The message field keeps its future.** When the WhatsApp agent lands it will
  populate `message` with the customer's actual text — which is the real source
  this field was always waiting for, and a far better one than a manager
  re-typing it. Removing the textarea removes the manual path, not the field.
- **Past orders keep their messages.** They are simply not surfaced, which was
  already true before this change.
