'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Injects the umami analytics script on deployed (production) builds only. In
 * local development (`next dev`, NODE_ENV !== 'production') this renders nothing,
 * so no tracking traffic is generated.
 *
 * Host and website id default to the homelab umami instance and can be
 * overridden via NEXT_PUBLIC_UMAMI_HOST / NEXT_PUBLIC_UMAMI_WEBSITE_ID.
 *
 * A client component only so it can read the path — the env gating is still
 * resolved at build time, since both variables are inlined.
 */
const UMAMI_HOST =
  process.env.NEXT_PUBLIC_UMAMI_HOST ?? 'http://umami.home:3000';
const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ??
  '92aac9e1-8f20-4385-ad2d-df7e99619fdf';

/**
 * The unattended views. These sit on TV screens in the production area, opened
 * once and left for the day, which umami records as a single visit lasting
 * twelve hours — a real page view, but not a real visit, and enough of them to
 * distort session duration, bounce rate and visitors-per-day for the whole site.
 *
 * Excluded by not loading the tracker at all rather than by filtering afterwards:
 * umami's dashboard filters work on its own built-in dimensions, so a property
 * marking kiosk traffic would let you *see* it without letting you subtract it
 * from the site-wide figures that are the actual problem.
 *
 * This is per-route, not per-device, so it also drops the handful of visits a
 * person makes to these screens from a desk. That is the accepted trade for
 * needing no setup on the TVs themselves: the views are read-only, and nothing
 * about them is worth the cost of getting the numbers wrong everywhere else. One
 * gap follows from the tracker being a page-level decision — navigating into one
 * of these routes from a tracked one leaves the already-loaded script running, so
 * that view is still counted. It is a manager clicking through the sidebar, which
 * is real traffic and holds no session open.
 */
const UNTRACKED_PREFIXES = ['/production', '/revisar-pedidos'];

export function UmamiScript() {
  const pathname = usePathname();

  if (process.env.NODE_ENV !== 'production' || !UMAMI_WEBSITE_ID) {
    return null;
  }

  // Prefix match on a path boundary, so `/production/salados` is covered while a
  // future `/production-costos` would not be silently swept up with it.
  const untracked = UNTRACKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (untracked) {
    return null;
  }

  return (
    <Script
      src={`${UMAMI_HOST}/script.js`}
      data-website-id={UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
      defer
    />
  );
}
