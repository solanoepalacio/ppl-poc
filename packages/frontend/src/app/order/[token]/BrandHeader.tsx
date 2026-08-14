import Image from 'next/image';

/**
 * Slate brand bar with the Panico wordmark, shared across every customer-page
 * state (entry, order received, invalid link) so the brand is always present.
 * Deliberately shallow: the entry screen is a long list on a phone, and every
 * pixel this takes is one the catalog and the order summary do not get.
 *
 * The bakery is **Panico**, one `n`. The repository, the packages and this
 * file's asset are all named `pannico` from before anyone had seen the name
 * written down; those are identifiers and stay as they are, but nothing a
 * customer reads should carry the second `n`. The asset below still does —
 * the image itself spells it out — and needs redrawing.
 */
export function BrandHeader() {
  return (
    <header className="brand-header">
      <Image
        src="/pannico-wordmark.png"
        alt="Panico — Panadería Creativa"
        width={600}
        height={203}
        priority
      />
    </header>
  );
}
