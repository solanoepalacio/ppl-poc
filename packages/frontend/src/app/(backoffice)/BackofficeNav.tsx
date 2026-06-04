'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The three back-office views, with Spanish labels and their routes. */
const LINKS = [
  { href: '/orders', label: 'Órdenes' },
  { href: '/links', label: 'Crear orden' },
  { href: '/production', label: 'Producción' },
] as const;

/**
 * Persistent back-office navigation: one link per view, highlighting the
 * active one based on the current path so the manager always knows where
 * they are. Rendered by the (backoffice) layout, so the customer order form
 * never shows it.
 */
export function BackofficeNav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Back office">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'nav-link active' : 'nav-link'}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
