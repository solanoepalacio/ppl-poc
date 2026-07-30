import { nanoid } from 'nanoid';

/** Generates a URL-safe random token suitable for embedding in a link path. */
export function generateToken(): string {
  // 21 chars of URL-safe alphabet — collision probability is negligible for the
  // PoC; uniqueness is additionally enforced by the DB unique constraint.
  return nanoid(21);
}
