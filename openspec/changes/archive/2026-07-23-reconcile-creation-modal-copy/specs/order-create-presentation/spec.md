## REMOVED Requirements

### Requirement: Creation modal omits per-path explanatory copy
**Reason**: The requirement framed the modal as a two-path choice and asserted the generated link appears in the creation modal — both untrue since link generation moved to its own trigger and modal (`generar-link-standalone`). Replaced by the single-path *Creation modal omits explanatory copy* below.

## ADDED Requirements

### Requirement: Creation modal omits explanatory copy
The order-creation modal SHALL NOT display explanatory paragraphs framing how to use it (e.g. "Ingresá la orden directamente cuando la tomás vos.", "Registrá una orden recibida por teléfono, WhatsApp o en persona."). The **Agregar pedido** action together with the client selector and product search SHALL communicate what the modal does on their own.

#### Scenario: No explanatory paragraphs in the modal
- **WHEN** the order-creation modal is shown
- **THEN** it does not present explanatory framing paragraphs
