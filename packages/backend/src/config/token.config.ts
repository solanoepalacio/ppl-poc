/** Reads the configurable token TTL (hours), defaulting to 4 if unset/invalid. */
export function getTokenTtlHours(): number {
  const raw = process.env.ORDER_TOKEN_TTL_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4;
}

/** Computes the expiry instant for a token created at `from` (default now). */
export function computeExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + getTokenTtlHours() * 60 * 60 * 1000);
}
