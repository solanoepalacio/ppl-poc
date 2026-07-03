/**
 * The production line a catalog product is baked on. The bakery runs two lines,
 * produced separately, and the back office reads each line's production totals
 * off its own view.
 *
 * SQLite has no native enums, so the backend stores `Product.category` as a plain
 * string validated against this union in the service layer (mirroring SlotStatus).
 * Code is English; the user-facing labels are Spanish (*salados* / *dulces*).
 *
 * - `salty` — savory breads (*salados*).
 * - `sweet` — pastries and sweets (*dulces*).
 */
export type ProductCategory = 'sweet' | 'salty';

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = ['sweet', 'salty'];

export function isProductCategory(value: unknown): value is ProductCategory {
  return (
    typeof value === 'string' &&
    (PRODUCT_CATEGORIES as readonly string[]).includes(value)
  );
}
