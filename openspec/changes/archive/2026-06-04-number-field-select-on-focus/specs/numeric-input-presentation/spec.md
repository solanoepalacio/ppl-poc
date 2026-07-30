## ADDED Requirements

### Requirement: Numeric quantity fields select their whole value on focus
Every numeric quantity input field SHALL select its entire current value when the field receives focus, so that the next character typed replaces the value rather than being inserted into it. This SHALL apply on every focus path — mouse click, keyboard tab, and programmatic focus — and to every surface that presents such a field, including the back-office order-creation modal, the back-office edit-items form, and the customer-facing quantity stepper. The field's existing value rules (minimum of zero and integer-only quantities) SHALL be unchanged.

#### Scenario: Focusing a field selects its value
- **WHEN** a numeric quantity field holding a non-empty value receives focus
- **THEN** the field's full value is selected

#### Scenario: Typing replaces the previous value
- **WHEN** a numeric quantity field showing `10` is focused and the user types `5`
- **THEN** the field's value becomes `5`, not `105` or `510`

### Requirement: Clicking anywhere in a numeric field selects the whole value
When a numeric quantity field is focused by a mouse click, the full value SHALL be selected regardless of where in the field the click lands; the click SHALL NOT leave the caret positioned between digits with the value unselected. Once the field is already focused, a further click SHALL be free to position the caret for deliberate single-digit editing.

#### Scenario: Click beside an existing digit still selects all
- **WHEN** the user clicks immediately to the right of the `0` in a field showing `0`
- **THEN** the whole value is selected
- **AND** typing a digit replaces the value rather than producing a multi-digit value such as `010`

#### Scenario: A second click while focused places a caret
- **WHEN** the field is already focused with its value selected and the user clicks within it again
- **THEN** the caret is placed at the clicked position for in-place editing
