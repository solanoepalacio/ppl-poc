import Image from 'next/image';

/**
 * Slate brand bar with the Pannico wordmark, shared across every customer-page
 * state (entry, order received, WhatsApp fallback, invalid link) so the brand
 * is always present.
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
