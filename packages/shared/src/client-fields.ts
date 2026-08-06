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
 * Reduces a phone number to its digits, so one number is one stored value
 * however it was typed — `+54 381 555-1234`, `(0381) 5551234` and `543815551234`
 * all become the same string. That is what makes the uniqueness constraint mean
 * anything, and what lets an inbound WhatsApp `wa_id` be matched directly.
 *
 * Returns `null` for absent, blank or digitless input: "no phone" is a real
 * state, and any number of clients may be in it.
 *
 * Deliberately not full E.164 — nothing here invents a country code it was not
 * given. Whether stored numbers must carry one is a decision for the change that
 * introduces the WhatsApp agent, which will have real payloads to match against.
 */
export function normalizeClientPhone(
  phone: string | null | undefined,
): string | null {
  if (phone === null || phone === undefined) return null;
  const digits = phone.replace(/\D/g, '');
  return digits === '' ? null : digits;
}
