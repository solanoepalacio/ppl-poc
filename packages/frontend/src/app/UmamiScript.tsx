import Script from 'next/script';

/**
 * Injects the umami analytics script on deployed (production) builds only. In
 * local development (`next dev`, NODE_ENV !== 'production') this renders nothing,
 * so no tracking traffic is generated.
 *
 * Host and website id default to the homelab umami instance and can be
 * overridden via NEXT_PUBLIC_UMAMI_HOST / NEXT_PUBLIC_UMAMI_WEBSITE_ID.
 */
const UMAMI_HOST =
  process.env.NEXT_PUBLIC_UMAMI_HOST ?? 'http://umami.home:3000';
const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ??
  '92aac9e1-8f20-4385-ad2d-df7e99619fdf';

export function UmamiScript() {
  if (process.env.NODE_ENV !== 'production' || !UMAMI_WEBSITE_ID) {
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
