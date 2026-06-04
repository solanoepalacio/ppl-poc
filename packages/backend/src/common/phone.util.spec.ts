import { normalizePhoneE164 } from './phone.util';

describe('normalizePhoneE164', () => {
  it('accepts a value composed by the back-office two-field entry', () => {
    // `381` (default area code) + `1234567` composes to this on the frontend.
    expect(normalizePhoneE164('+5493811234567')).toBe('+5493811234567');
  });

  it('returns null for a number too short to be valid E.164', () => {
    expect(normalizePhoneE164('+5493811')).toBeNull();
  });

  it('returns null when the country-code `+` is missing', () => {
    expect(normalizePhoneE164('5493811234567')).toBeNull();
  });
});
