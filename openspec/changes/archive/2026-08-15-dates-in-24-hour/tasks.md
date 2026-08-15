## 1. The formatter

- [x] 1.1 One shared module beside `slotLabel`, plain (non-'use client') so
  Server Components can call it directly.
- [x] 1.2 `hour12: false`. The defect was never the missing a. m./p. m. marker —
  it was a 12-hour clock printing 09:05 for both nine in the morning and nine at
  night.
- [x] 1.3 Locale and time zone stated, not inherited. On a host set to UTC every
  hour would be three out and anything near midnight would land on the wrong day.

## 2. The call sites

- [x] 2.1 The orders table, which is where the ambiguity was visible.
- [x] 2.2 The producción real history and the printed review sheet, which had
  their own formats — three formats existed across the back office.
- [x] 2.3 The bloque label, date only, through the same formatter for its zone.

## 3. Verify

- [x] 3.1 No `toLocaleString` left without explicit options.
- [x] 3.2 The rendered orders table shows an evening order as `23:04`.
- [x] 3.3 Run the formatter under `TZ=UTC` and `TZ=Europe/Madrid`: the same
  instant reads as Argentine local time in both, and an order at 21:05 does not
  drift to the next day.
- [x] 3.4 Frontend `lint`.
