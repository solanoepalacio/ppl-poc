import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

/**
 * Layout shared by the back-office views (orders, production). Renders the
 * persistent collapsible sidebar and a full-viewport shell around each view;
 * the shell is `position: fixed` so it fills the desktop screen instead of the
 * narrow customer column. The customer order form lives outside this group and
 * is unaffected.
 */
export default function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Sidebar>{children}</Sidebar>;
}
