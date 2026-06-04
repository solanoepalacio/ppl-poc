/**
 * Back-office phone entry helpers for the Argentine `0[area] 15[number]`
 * convention. The manager enters an area code (defaulting to `381`) and a
 * local subscriber number; these compose into a single E.164 string for
 * storage and transport. The `0` and `15` are domestic-only dialing prefixes
 * and never appear in the composed value.
 */

/** Default area code (Tucumán) pre-filled in the back-office phone field. */
export const DEFAULT_AREA_CODE = '381';

/** Argentine mobile E.164 prefix: country code `54` + mobile indicator `9`. */
const AR_MOBILE_PREFIX = '+549';

const digitsOnly = (input: string): string => input.replace(/\D/g, '');

/**
 * Composes an area code and local number into an Argentine mobile E.164 number
 * (`+54 9 <area> <number>`). Non-digit characters in either part are stripped,
 * so separators in the local number (spaces, dashes) are ignored.
 */
export function composePhoneE164(
  areaCode: string,
  localNumber: string,
): string {
  return `${AR_MOBILE_PREFIX}${digitsOnly(areaCode)}${digitsOnly(localNumber)}`;
}

/**
 * True when both parts are present and their composition yields a valid E.164
 * number (a leading `+` and 8–15 digits). Mirrors the backend
 * `normalizePhoneE164` length rule so the form blocks values the API rejects.
 */
export function isValidPhoneEntry(
  areaCode: string,
  localNumber: string,
): boolean {
  if (digitsOnly(areaCode).length === 0 || digitsOnly(localNumber).length === 0) {
    return false;
  }
  const digits = digitsOnly(composePhoneE164(areaCode, localNumber));
  return digits.length >= 8 && digits.length <= 15;
}
