## REMOVED Requirements

### Requirement: Two-field phone entry with default area code
**Reason**: The back office no longer captures a customer phone number — orders are attached to a client selected from the directory, so the two-field phone-entry control is retired.
**Migration**: The order-creation modal's phone control is replaced by the client selector (see `order-create-presentation`); no phone is entered anywhere in the back office.

### Requirement: Composition into stored E.164 number
**Reason**: With no phone captured, there is nothing to compose into an E.164 number; `Order.phone` is removed in favour of `Order.clientId`.
**Migration**: Existing orders are backfilled to a placeholder client and lose their phone column; no E.164 composition remains.

### Requirement: Validation of phone entry
**Reason**: There is no phone entry to validate; the order-creation actions are gated on a selected client instead.
**Migration**: Client selection replaces phone validation as the precondition for generating a link or creating an order.
