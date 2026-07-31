## REMOVED Requirements

### Requirement: Customer can fall back to WhatsApp
**Reason**: The control is being removed from the form. Choosing it consumed the
single-use link and recorded no items, so the bakery was left with an empty
consumed order and had to transcribe the order by hand over WhatsApp anyway —
the very transcription this product exists to remove. It also occupied the action
bar as a standing alternative to the one action that matters.
**Migration**: None for existing data. `Order.consumedAt` keeps its meaning and
orders consumed this way in the past remain valid history; there is simply one
fewer way to reach that state. A customer who cannot complete the form contacts
the bakery directly, and the manager records the order through **Agregar
pedido**, which captures the items rather than discarding them.
