import type { ReactNode } from 'react';

/**
 * The per-view page header rendered at the top of each back-office main column:
 * an Oswald title with a muted subtitle on the same baseline, over a hairline.
 */
export function ViewHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <header className="bo-header">
      <h1>{title}</h1>
      <span className="subtitle">{subtitle}</span>
    </header>
  );
}
