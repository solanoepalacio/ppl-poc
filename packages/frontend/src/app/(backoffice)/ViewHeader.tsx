import type { ReactNode } from 'react';

/**
 * The per-view page header rendered at the top of each back-office main column:
 * an Oswald title with a muted subtitle on the same baseline, over a hairline.
 * `modifier` lets one view adjust the header without changing it everywhere —
 * the production views use it to enlarge the subtitle for reading at a distance,
 * which would be wrong on the orders view.
 */
export function ViewHeader({
  title,
  subtitle,
  modifier,
}: {
  title: string;
  subtitle: ReactNode;
  modifier?: string;
}) {
  return (
    <header className={modifier ? `bo-header ${modifier}` : 'bo-header'}>
      <h1>{title}</h1>
      <span className="subtitle">{subtitle}</span>
    </header>
  );
}
