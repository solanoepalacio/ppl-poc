## 1. Navigation & metadata

- [x] 1.1 `app/layout.tsx`: translate the metadata description ("Order intake PoC" → e.g. "Recepción de órdenes"). Leave the "Pannico" title as-is (brand).
- [x] 1.2 `app/(backoffice)/BackofficeNav.tsx`: translate the `aria-label` "Back office" → "Oficina de gestión" (nav link labels are already Spanish).

## 2. Orders view

- [x] 2.1 `app/(backoffice)/orders/page.tsx`: translate heading "Orders" → "Órdenes", "Day " → "Día ", "View" → "Ver", empty state "No orders created on {day}." → "No hay órdenes creadas el {day}.", and "No items." → "Sin artículos.".
- [x] 2.2 `app/(backoffice)/orders/OrderActions.tsx`: translate the two `window.confirm` prompts, the two catch-fallback errors ("Failed to save/delete..."), and all button/modal labels ("Edit items", "Delete", "Save items", "Cancel", modal title) to Spanish per the design glossary.
- [x] 2.3 `app/(backoffice)/orders/OrderStatusControl.tsx`: translate the `aria-label` "Order status" → "Estado de la orden" and the "failed" text → "falló"; add a status→Spanish-label lookup (pendiente/emitida/finalizada/ignorada) for display only, keeping the stored/sent enum value unchanged.
- [x] 2.4 `app/(backoffice)/orders/Modal.tsx`: translate the close `aria-label` "Close" → "Cerrar".

## 3. Create-order / links view

- [x] 3.1 `app/(backoffice)/links/page.tsx`: translate the two instructional paragraphs ("Generate a link…", "Enter the order directly…") to Spanish (voseo); headings are already Spanish.
- [x] 3.2 `app/(backoffice)/links/LinkGenerator.tsx`: translate errors ("Something went wrong.", "That phone number looks incomplete."), button states ("Generate"/"Generating…" → "Generar"/"Generando…"), the share instruction, the "For {phone} · expires {date}" metadata, and copy button ("Copy link"/"Copied!" → "Copiar enlace"/"¡Copiado!").
- [x] 3.3 `app/(backoffice)/links/DirectOrderForm.tsx`: translate the intro copy, the incomplete-phone error, the "Failed to create order." error, "Order created." success, "Message (optional)" label, the textarea placeholder, and button states ("Create order"/"Creating…" → "Crear orden"/"Creando…").
- [x] 3.4 `app/(backoffice)/links/PhoneField.tsx`: translate label "Phone" → "Teléfono" and aria-labels "Area code" → "Código de área", "Local number" → "Número local" (keep the numeric placeholder).

## 4. Production view

- [x] 4.1 `app/(backoffice)/production/page.tsx`: translate heading "Daily production" → "Producción diaria", "Day " → "Día ", "View" → "Ver", the "Items to produce on {day}…" instruction, and the "Nothing to produce on {day}." empty state.

## 5. Verification

- [x] 5.1 Grep the back-office tree for residual English (e.g. common words: `Order`, `View`, `Delete`, `Cancel`, `Save`, `Create`, `Generate`, `Phone`, `Failed`, `Close`, `Day `) and confirm only brand names / enum values / code identifiers remain.
- [x] 5.2 Manually open each back-office screen (orders, links/create, production) and confirm every visible string, dialog, and aria-label is Spanish and reads in a consistent voseo voice.
