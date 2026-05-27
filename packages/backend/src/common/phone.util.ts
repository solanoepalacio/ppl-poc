/**
 * Normalizes a phone number to E.164 (`+` followed by 8–15 digits).
 * Strips spaces, dashes, parentheses and dots. Requires a leading `+` country
 * code. Returns the normalized string, or `null` if the input is missing or
 * cannot be normalized to a valid E.164 number.
 */
export function normalizePhoneE164(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  // E.164 allows 8–15 digits and mandates a country code (the leading +).
  if (!hasPlus || digits.length < 8 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
}
