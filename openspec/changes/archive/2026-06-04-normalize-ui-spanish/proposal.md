## Why

The customer-facing order page is fully in Spanish, but the back-office (orders, create-order/links, production, navigation) is a mix of English and Spanish — "Generate" next to "Crear orden", "Orders" next to "Producción", English confirmation/error dialogs, and English aria-labels. This inconsistency looks unfinished and makes the tool harder to read for the Spanish-speaking bakery staff who use it. Normalizing everything to Spanish gives the whole product one coherent voice.

## What Changes

- Translate all back-office **visible text** to Spanish: page headings ("Orders" → "Órdenes", "Daily production" → "Producción diaria"), section copy, button labels ("View" → "Ver", "Generate" → "Generar", "Create order" → "Crear orden", "Edit items", "Delete", "Save items", "Cancel", "Copy link"), busy states ("Generating…", "Creating…"), empty states, and instructional text.
- Translate all back-office **confirmation and error messages** to Spanish (the `window.confirm` dialogs and catch-fallback errors in `OrderActions`, `LinkGenerator`, `DirectOrderForm`, `OrderStatusControl`).
- Translate all back-office **accessibility strings** (aria-labels) to Spanish: "Area code", "Local number", "Phone", "Order status", "Close", "Back office".
- Translate **field labels and placeholders** to Spanish: "Phone" → "Teléfono", "Message (optional)" → "Mensaje (opcional)", and the WhatsApp-message placeholder.
- Update the document **metadata** description ("Order intake PoC") to Spanish.
- Adopt one consistent Spanish voice matching the existing customer-facing copy (informal Argentine voseo, sentence-case) across the back-office.

No behavioral, API, data, or routing changes — this is presentation-only.

## Capabilities

### New Capabilities
- `back-office-localization`: All back-office UI text (headings, labels, buttons, placeholders, instructional copy, confirmation/error messages, and accessibility strings) is presented in Spanish, in a voice consistent with the customer-facing order page.

### Modified Capabilities
<!-- None. The customer-side "copy is in Spanish" requirement already lives in
     order-intake-presentation and is already satisfied; this change only adds
     the back-office equivalent as a new capability. -->

## Impact

- **Affected code** (presentation strings only):
  - `app/layout.tsx` (metadata description)
  - `app/(backoffice)/BackofficeNav.tsx`
  - `app/(backoffice)/orders/page.tsx`, `OrderActions.tsx`, `OrderStatusControl.tsx`, `Modal.tsx`
  - `app/(backoffice)/links/page.tsx`, `LinkGenerator.tsx`, `DirectOrderForm.tsx`, `PhoneField.tsx`
  - `app/(backoffice)/production/page.tsx`
- **No impact** on backend, APIs, shared types, database, or routing.
- **Out of scope**: the customer order page (already Spanish), order-status enum *values* stored in the DB, and any future i18n/translation framework (strings stay inline).
