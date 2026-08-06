'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * How often an unattended view re-reads its data. Two minutes rather than
 * something tighter because these views spend most of their time scrolling
 * themselves (see AutoScroll) — a refresh landing mid-scroll changes content
 * under the reader's eye, and orders do not arrive fast enough to make that
 * worth it.
 */
const INTERVAL_MS = 120_000;

/**
 * Keeps an unattended view current: re-runs the server render periodically so
 * orders that arrive after the page was opened show up on their own — these
 * views sit on a screen in the production area, where nobody is going to press
 * reload. Shared by the two production views and Revisar Pedidos. Renders
 * nothing; it exists only for the timer, so it cannot affect the layout. Uses the same client-island-refreshes-the-server-tree pattern
 * as the orders view's action buttons, with a tick instead of a click as the
 * trigger, and `startTransition` so the new figures swap in without tearing down
 * what is on screen.
 *
 * Polling pauses while the tab is hidden (a forgotten tab shouldn't poll for
 * hours) and refreshes immediately when it comes back, so someone returning to
 * the tab never reads numbers from before they left.
 */
export function AutoRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => startTransition(() => router.refresh());

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      refresh();
    }, INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [router, startTransition]);

  return null;
}
