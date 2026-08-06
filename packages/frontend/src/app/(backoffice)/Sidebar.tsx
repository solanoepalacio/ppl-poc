'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The back-office views, with Spanish labels, routes, and their nav glyphs. */
const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: '/orders',
    label: 'Pedidos',
    icon: (
      <path d="M3 6h18M3 12h18M3 18h12" />
    ),
  },
  {
    href: '/production/salados',
    label: 'Producción salados',
    icon: <path d="M12 3l7 4v6c0 3.5-3 6.5-7 8-4-1.5-7-4.5-7-8V7z" />,
  },
  {
    href: '/production/dulces',
    label: 'Producción dulces',
    icon: (
      <>
        <path d="M4 15h16l-1.5 5.5H5.5z" />
        <path d="M6 15c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M12 6V4" />
      </>
    ),
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: (
      <>
        <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M17 11h4M19 9v4" />
      </>
    ),
  },
];

/**
 * Persistent back-office sidebar: a collapsible hamburger menu with one link per
 * view, highlighting the active one based on the current path. The collapse
 * toggle hides the labels/brand and centers the icons. Rendered by the
 * (backoffice) layout, so the customer order form never shows it.
 */
export function Sidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? 'bo-shell collapsed' : 'bo-shell'}>
      <aside className="bo-sidebar">
        <div className="bo-sidebar-head">
          <button
            type="button"
            className="bo-hamburger"
            aria-label="Alternar menú"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="bo-brand">Pannico</span>
        </div>

        <nav className="bo-nav" aria-label="Oficina de gestión">
          {LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'bo-nav-link active' : 'bo-nav-link'}
                aria-current={active ? 'page' : undefined}
                title={label}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {icon}
                </svg>
                <span className="bo-nav-label">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* A plain form POST, so ending the session does not depend on client
            JavaScript any more than logging in does. */}
        <form method="post" action="/logout" className="bo-logout">
          <button type="submit" className="bo-nav-link" title="Cerrar sesión">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className="bo-nav-label">Cerrar sesión</span>
          </button>
        </form>
      </aside>

      <div className="bo-main">{children}</div>
    </div>
  );
}
