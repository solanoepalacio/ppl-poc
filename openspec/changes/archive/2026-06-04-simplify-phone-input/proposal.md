## Why

Today the manager types a full E.164 phone number (e.g. `+5491122334455`) into a single field. That demands recalling the country code, the mobile `9`, and the area code on every entry — slow and error-prone for the high-frequency case where the customer is local (area code 381). We can remove almost all of that typing by matching how Argentines actually write phone numbers.

## What Changes

- Replace the single back-office phone input with **two fields** following the familiar Argentine `0[ ] 15[ ]` convention: an **area code** field and a **local number** field.
- The area code field **defaults to `381`**, so in the common local case the manager only clicks into the number field and types the subscriber digits.
- The two fields are composed into the stored E.164 number (the persisted shape is unchanged — still one normalized `phone` string).
- Apply the new entry control in both back-office places that capture a phone: the **order-link generator** and the **direct order form**.
- Validation moves from "must be a full E.164 string" to "valid area code + valid local number", with clear feedback when either is missing or malformed.

## Capabilities

### New Capabilities
- `phone-entry`: The back-office two-field phone entry convention — an area-code field (default `381`) and a local-number field shown as `0[area] 15[number]` — and the rules for composing and normalizing them into the stored E.164 phone number.

### Modified Capabilities
<!-- order-links and order-management consume phone-entry but their own requirements
     (generate a link / create an order from a phone number) are unchanged. The stored
     phone shape and downstream behavior stay the same, so no delta specs are needed. -->

## Impact

- **Frontend**: `LinkGenerator.tsx` and `DirectOrderForm.tsx` swap their single phone `<input>` for the shared two-field control; a small composer/validator helper produces the E.164 value sent to the API.
- **Shared/Backend**: `phone.util.ts` normalization is reused or extended to accept the composed value; request DTOs (`CreateLinkDto`, `CreateOrderDto`) and the API contract are unchanged if composition happens client-side (to be settled in design).
- **No data model change**: `Order.phone` stays a single E.164 string; no migration required.
- **Tests**: add cases for area-code defaulting, composition, and malformed-input rejection.
