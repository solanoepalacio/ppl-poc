## Why

The orders view shows when each order was taken, and it cannot tell morning from
evening: `toLocaleString('es-AR')` with no options returns a 12-hour time **and
omits the a. m./p. m. marker**, so 09:05 and 21:05 both render as `09:05:00`.

Alongside that, the three places that show a timestamp each format it their own
way, and none of them pins a time zone — so a deployment on a UTC host would
display every hour three off.

## What Changes

- **A 24-hour clock**, `dd/mm/aaaa hh:mm`, which is how the hour is written in
  Argentina and needs no marker to be unambiguous.
- **One shared formatter**, beside `slotLabel` — which already exists because
  this exact class of bug was hit before.
- **Locale and time zone stated explicitly**, not inherited from the host.

## Capabilities

### Modified Capabilities
- `back-office-localization`: how a date and a time are written, which until now
  was only ever decided per call site.

## Impact

- **Nothing stored changes.** Prisma keeps `DateTime` as epoch milliseconds and
  the API returns ISO strings: an unambiguous instant. The defect was only ever
  in the rendering.
- Three call sites converge on one format: the orders table, the producción real
  history, and the printed review sheet. The bloque label keeps showing only a
  date, now through the same formatter.
