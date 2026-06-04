# phone-entry Specification

## Purpose

Defines how the back office captures a customer phone number through a simplified two-field control following the Argentine `0[area] 15[number]` convention, and how those fields compose into a single normalized E.164 number for storage and transport.

## Requirements

### Requirement: Two-field phone entry with default area code

The back office SHALL capture a customer phone number through two adjacent fields laid out in the Argentine `0[area] 15[number]` convention: an **area code** field and a **local number** field. The area code field SHALL default to `381`. The `0` and `15` SHALL be shown as static, non-editable decorations so the manager only edits the area code and local number.

This entry control SHALL be used everywhere the back office captures a phone number — the order-link generator and the direct order form.

#### Scenario: Local customer needs only the local number

- **WHEN** the manager opens a back-office form that captures a phone number
- **THEN** the area code field is pre-filled with `381`
- **AND** the manager can complete entry by typing only the local number

#### Scenario: Non-local area code

- **WHEN** the manager replaces the default `381` with another area code and enters a local number
- **THEN** the form accepts the substituted area code for composition

### Requirement: Composition into stored E.164 number

The system SHALL compose the two fields into a single E.164 number for storage and transport, using the Argentine mobile form `+54 9 <area code> <local number>`. Only digits from the two fields SHALL be used; the `0` and `15` decorations and any separators SHALL be discarded. The composed value SHALL satisfy the existing E.164 normalization (leading `+` and 8–15 digits). The persisted phone shape SHALL remain a single normalized E.164 string, unchanged from before this change.

#### Scenario: Compose default area code and local number

- **WHEN** the area code is `381` and the local number is `1234567`
- **THEN** the system composes and submits the phone as `+5493811234567`

#### Scenario: Separators in the local number are ignored

- **WHEN** the local number contains spaces or dashes (e.g. `123-4567`)
- **THEN** the system strips them before composing the E.164 value

### Requirement: Validation of phone entry

The system SHALL reject submission when the area code or local number is missing, or when their composition does not yield a valid E.164 number, and SHALL surface clear feedback indicating which part is invalid. Nothing SHALL be submitted on rejection.

#### Scenario: Missing local number

- **WHEN** the manager attempts to submit with the default area code but an empty local number
- **THEN** the system blocks submission and indicates the local number is required

#### Scenario: Too few digits to form a valid number

- **WHEN** the composed digits fall below the minimum E.164 length
- **THEN** the system blocks submission and reports the number as invalid
