/**
 * Human label for a production bloque, shared by the client-side bloque toolbar
 * and the server-rendered production view. Kept in a plain (non-'use client')
 * module so Server Components can call it directly — importing it from a client
 * module would turn it into a client reference, not a callable function.
 *
 * e.g. "Bloque #3 · 12/6/2026 – 15/6/2026" or "Bloque #4 · 15/6/2026 (abierto)".
 */
export function slotLabel(slot: {
  seq: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
}): string {
  const opened = new Date(slot.openedAt).toLocaleDateString();
  if (slot.status === 'open') {
    return `Bloque #${slot.seq} · desde ${opened} (abierto)`;
  }
  const closed = slot.closedAt
    ? new Date(slot.closedAt).toLocaleDateString()
    : '';
  return `Bloque #${slot.seq} · ${opened} – ${closed}`;
}
