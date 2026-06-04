import type { ReactNode } from 'react';
import { BackofficeNav } from './BackofficeNav';

/**
 * Layout shared by the back-office views (orders, production). Renders
 * the persistent navigation above each view. The customer order form lives
 * outside this group and is unaffected.
 */
export default function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <BackofficeNav />
      {children}
    </>
  );
}
