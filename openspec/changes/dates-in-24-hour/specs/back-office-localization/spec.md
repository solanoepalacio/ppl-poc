## ADDED Requirements

### Requirement: Dates and times are shown on a 24-hour clock
Every date and time the back office displays SHALL use the Argentine
convention — `dd/mm/aaaa` — and, where a time of day is shown, a **24-hour**
clock: `21:05`, never `09:05` for the evening.

A 12-hour clock SHALL NOT be used. Left to the runtime's default, the locale
produces a 12-hour time and omits the a. m./p. m. marker, so nine in the morning
and nine at night render as the same string — an order taken in the evening and
one taken at breakfast become indistinguishable in the very column that exists to
tell them apart. Stating the hour on a 24-hour clock removes the ambiguity
without depending on a marker the platform may or may not include.

The formatting SHALL be defined in one place and used by every view, so that the
same instant reads the same way wherever it appears.

Both the locale and the time zone SHALL be stated explicitly rather than taken
from the environment. The server renders with no locale configured and would pick
a foreign one — producing text that disagrees with the browser's and, for a
component rendered on both, a hydration mismatch. The time zone SHALL be
Argentina's, so a deployment whose clock is set to UTC does not shift every hour
displayed, and a date near midnight does not fall on the previous day.

#### Scenario: Morning and evening are distinguishable
- **WHEN** the back office shows a time of 09:05 and a time of 21:05
- **THEN** the two are rendered differently

#### Scenario: One format across the views
- **WHEN** the same instant is shown on more than one back-office view
- **THEN** it is rendered the same way in each

#### Scenario: The displayed hour does not follow the server's clock setting
- **WHEN** the application runs on a host whose time zone is not Argentina's
- **THEN** the times shown are still Argentine local time
