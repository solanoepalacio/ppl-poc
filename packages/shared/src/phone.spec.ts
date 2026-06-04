import {
  DEFAULT_AREA_CODE,
  composePhoneE164,
  isValidPhoneEntry,
} from './phone';

describe('composePhoneE164', () => {
  it('composes the default area code and a local number into E.164', () => {
    expect(composePhoneE164(DEFAULT_AREA_CODE, '1234567')).toBe(
      '+5493811234567',
    );
  });

  it('strips separators (spaces, dashes) from the local number', () => {
    expect(composePhoneE164('381', '123-4567')).toBe('+5493811234567');
    expect(composePhoneE164('381', '123 4567')).toBe('+5493811234567');
  });

  it('uses a substituted (non-default) area code', () => {
    expect(composePhoneE164('11', '12345678')).toBe('+5491112345678');
  });
});

describe('isValidPhoneEntry', () => {
  it('accepts the default area code with a valid local number', () => {
    expect(isValidPhoneEntry(DEFAULT_AREA_CODE, '1234567')).toBe(true);
  });

  it('rejects a missing local number', () => {
    expect(isValidPhoneEntry(DEFAULT_AREA_CODE, '')).toBe(false);
    expect(isValidPhoneEntry(DEFAULT_AREA_CODE, '   ')).toBe(false);
  });

  it('rejects a missing area code', () => {
    expect(isValidPhoneEntry('', '1234567')).toBe(false);
  });

  it('rejects too few composed digits for a valid E.164 number', () => {
    // +549 (3) + 381 (3) + 1 (1) = 7 digits, below the 8-digit minimum.
    expect(isValidPhoneEntry('381', '1')).toBe(false);
  });
});
