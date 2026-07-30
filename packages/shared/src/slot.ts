/**
 * A production "bloque" — the container orders are slotted into. Unlike the old
 * day-based grouping, a bloque spans an arbitrary span of days: at any moment
 * exactly one bloque is `open` and new orders land in it. The manager closes the
 * open bloque manually when a production run is done, which atomically opens a
 * fresh one — so there is always exactly one open bloque.
 *
 * SQLite has no native enums, so the backend stores `status` as a plain string
 * validated against this union in the service layer.
 *
 * - `open`   — currently accepting new orders. Exactly one exists at any time.
 * - `closed` — a finished production run; read-only history.
 */
export type SlotStatus = 'open' | 'closed';

export const SLOT_STATUSES: readonly SlotStatus[] = ['open', 'closed'];

export function isSlotStatus(value: unknown): value is SlotStatus {
  return (
    typeof value === 'string' &&
    (SLOT_STATUSES as readonly string[]).includes(value)
  );
}

/** A production bloque. `seq` is a human-facing display number (Bloque #N). */
export interface Slot {
  id: string;
  seq: number;
  status: SlotStatus;
  /** Instant the bloque was opened. */
  openedAt: string;
  /** Instant the bloque was closed; null while open. */
  closedAt: string | null;
}

/** A bloque as shown in the management list, carrying its order count. */
export interface SlotListItem extends Slot {
  orderCount: number;
}

/** `GET /slots` response: all bloques, newest (highest seq) first. */
export interface SlotListResponse {
  slots: SlotListItem[];
}

/**
 * `POST /slots/close` response: the bloque that was just closed plus the fresh
 * open bloque that replaced it.
 */
export interface CloseSlotResponse {
  closed: Slot;
  open: Slot;
}
