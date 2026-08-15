/**
 * How the back office writes a date and a time, in one place.
 *
 * Kept in a plain (non-'use client') module so Server Components can call it
 * directly, the same reason `slotLabel` lives beside it.
 *
 * **24-hour, always.** `toLocaleString('es-AR')` with no options returns a
 * 12-hour time *and* omits the a. m./p. m. marker, so 09:05 and 21:05 both come
 * out as `09:05:00` — an order taken at breakfast and one taken at night read
 * identically in the column that exists to tell them apart. `hour12: false`
 * removes the ambiguity without relying on a marker the platform may drop.
 *
 * **Locale and time zone are stated, not inherited.** The server renders with no
 * locale configured and would pick `en-US`, which disagrees with the browser and
 * shows up as a hydration mismatch on anything rendered in both. The zone is
 * pinned for the same reason in space rather than language: on a host set to UTC
 * every hour would be three out, and anything near midnight would land on the
 * wrong day.
 */
const LOCALE = 'es-AR';

/**
 * Argentina observes no daylight saving, so this is UTC−3 year-round and the
 * choice among the `America/Argentina/*` zones does not change the result.
 */
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const DATE: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TIME_ZONE,
};

const TIME: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
};

/** `15/08/2026` */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, DATE);
}

/** `21:05` */
export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(LOCALE, TIME);
}

/** `15/08/2026 21:05` — a space rather than a comma, so it wraps as two words. */
export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}
