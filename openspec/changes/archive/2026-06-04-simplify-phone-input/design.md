## Context

Both back-office phone-capture points — `LinkGenerator.tsx` (order links) and `DirectOrderForm.tsx` (direct orders) — currently use one free-text `<input>` for a full E.164 number. The value flows to the API as `phone: string` and is normalized by `packages/backend/src/common/phone.util.ts` (`normalizePhoneE164`), which requires a leading `+` and 8–15 digits. The stored field `Order.phone` is a single E.164 string.

The change replaces that single input with the Argentine `0[area] 15[number]` two-field convention, defaulting the area code to `381`, while keeping the persisted/transported phone shape identical.

## Goals / Non-Goals

**Goals:**
- One reusable two-field phone-entry control shared by both back-office forms.
- Default the area code to `381`; let the manager usually type only the local number.
- Compose the fields into a valid E.164 string (`+54 9 <area> <number>`) before it leaves the form.
- Clear, per-part validation feedback.

**Non-Goals:**
- No change to the data model, Prisma schema, or migrations (`Order.phone` stays one E.164 string).
- No change to the API contract or backend DTOs.
- No change to the customer-facing order page (it does not capture phone numbers).
- No general international phone support — the convention is Argentine mobile only for this PoC.

## Decisions

- **Compose client-side; API stays `phone: string`.** The shared control owns the two fields and emits a single composed E.164 value; `createLink`/`createOrder` are unchanged.
  - *Rationale:* smallest blast radius, no DTO/spec changes to `order-links` or `order-management`, backend `normalizePhoneE164` keeps validating the composed value as defense-in-depth.
  - *Alternative considered:* send `{ areaCode, localNumber }` to the backend and compose there. Rejected — it ripples through DTOs, shared types, and two specs for no PoC benefit.

- **A shared React component, e.g. `PhoneField`, in the back-office links area** (next to `LinkGenerator`/`DirectOrderForm`), with a small pure helper `composePhoneE164(areaCode, localNumber)` (and a validity check) that is unit-testable without rendering.
  - *Rationale:* keeps composition logic out of the components and directly testable with Jest.

- **Composition rule:** `+` + `54` + `9` + digits(areaCode) + digits(localNumber); strip all non-digits from each field first. The `0` and `15` are rendered as static label decorations, never part of the value.
  - *Rationale:* matches Argentine mobile E.164; `0`/`15` are domestic-only prefixes that must be dropped.

- **Validation:** the form is invalid (submit disabled / blocked with a message) unless both parts are present and `composePhoneE164(...)` passes `normalizePhoneE164`. Reuse the existing length/format rules rather than inventing new ones.

## Risks / Trade-offs

- **Area code length varies in Argentina (2–4 digits).** → Don't hardcode `381`'s length; validate on the composed E.164 length, not on a fixed area-code width.
- **Managers might paste a full `+54…` number into the local field out of habit.** → Helper strips non-digits and the composed result is re-validated; a paste containing a country code would fail validation and surface a clear message rather than silently double-prefixing. (Accepted limitation for the PoC; no auto-detection of pasted full numbers.)
- **Two call sites must adopt the shared control consistently.** → Single component + helper keeps them in lockstep; covered by tests on the helper.

## Open Questions

- Exact placement/name of the shared component file (cosmetic; resolve during implementation).
- Whether to visually show the live composed E.164 preview under the fields (nice-to-have, not required by the spec).
