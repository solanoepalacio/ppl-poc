/**
 * Normalizes a string for accent- and case-insensitive substring matching,
 * used to filter the client directory as the manager types. Lowercases and
 * strips diacritics (e.g. "Almacén" → "almacen") so "almac" matches "Almacén".
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
