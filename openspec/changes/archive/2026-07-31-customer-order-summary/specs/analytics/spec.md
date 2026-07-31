## REMOVED Requirements

### Requirement: Instrumented customer order events
**Reason**: One of its three scenarios requires a `whatsapp_fallback_selected`
event to be emitted when a customer chooses the WhatsApp fallback. That outcome no
longer exists, so the scenario has to disappear rather than be reworded, and a
MODIFIED delta cannot drop it.
**Migration**: See the new *Instrumented customer order outcomes* requirement below. Both surviving events — `order_confirmed` with its
item count and total quantity, and `order_link_invalid` — are carried over
unchanged.

## ADDED Requirements

### Requirement: Instrumented customer order outcomes

The customer-facing order flow SHALL emit custom events at its key outcomes.

#### Scenario: Order confirmed via form
- **WHEN** a customer successfully confirms an order through the form
- **THEN** an `order_confirmed` event is emitted with the item count and total
  quantity

#### Scenario: Invalid order link opened
- **WHEN** a customer opens an order link that is expired or already used
- **THEN** an `order_link_invalid` event is emitted
