import Image from 'next/image';

/**
 * Slate brand bar with the Pannico wordmark, shared across every customer-page
 * state (entry, order received, invalid link) so the brand is always present.
 * Deliberately shallow: the entry screen is a long list on a phone, and every
 * pixel this takes is one the catalog and the order summary do not get.
 */
export function BrandHeader() {
  return (
    <header className="brand-header">
      <Image
        src="/pannico-wordmark.png"
        alt="Pannico — Panadería Creativa"
        width={600}
        height={203}
        priority
      />
    </header>
  );
}
