import { normalizeForSearch } from './search';

/**
 * Derives a client's slug — its natural key — from the display name: the same
 * accent-stripping, lowercasing normalization the search uses, with everything
 * that is not alphanumeric collapsed to single dashes.
 *
 * Built on `normalizeForSearch` rather than its own transliteration so a name
 * cannot normalize one way for searching and another for its key. Two names that
 * differ only in case, accents or punctuation therefore produce the *same* slug
 * and collide — which is the point: they are the same client typed twice, and
 * the manager should be told so rather than ending up with both.
 */
export function slugifyClientName(name: string): string {
  return normalizeForSearch(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reduces a phone number to the canonical form both sides of a WhatsApp match are
 * compared in: digits only, with the Argentine mobile `9` removed.
 *
 * Digits only means `+54 9 381 555-1234`, `(0381) 15 555-1234` and
 * `5493815551234` stop being three different strings. The `9` has to go too
 * because it is the one digit the two sides genuinely disagree about: a number is
 * dialled as `+54 9 381 …` but WhatsApp reports the sender's `wa_id` as
 * `54 381 …`, and comparing those would never match. Dropping it on both sides
 * makes the comparison a comparison rather than an interpretation.
 *
 * This is the form that gets **stored**, so a client's number is unique per real
 * number rather than per way of writing it. Storing what was typed and
 * canonicalizing only at match time would let the same number be entered twice in
 * two styles, as two clients, and an inbound message would then match both.
 *
 * Returns `null` for absent, blank or digitless input: "no phone" is a real
 * state, and any number of clients may be in it.
 *
 * Argentina-specific on purpose. The bakery's customers are all local, and a
 * general rule would have to encode every country's mobile conventions to buy
 * nothing today. If that changes, this is the one place to widen.
 */
export function normalizeClientPhone(
  phone: string | null | undefined,
): string | null {
  if (phone === null || phone === undefined) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits === '') return null;
  // `54` + `9` + area + line → `54` + area + line. Guarded on the country code so
  // a number from anywhere else that happens to start `…9…` is left alone.
  return digits.startsWith('549') ? '54' + digits.slice(3) : digits;
}
