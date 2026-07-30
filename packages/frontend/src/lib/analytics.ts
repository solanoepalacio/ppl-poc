/**
 * Client-side analytics helper. Emits custom events to umami when the tracking
 * script is present (deployed environments); a safe no-op otherwise (local dev,
 * script blocked, or not yet loaded). Page views are tracked automatically by
 * umami — only custom action/conversion events go through here.
 *
 * The full event taxonomy is documented in docs/analytics-events.md. Keep that
 * doc and the `AnalyticsEvent` union below in sync.
 */

/** Every custom analytics event the app may emit. */
export type AnalyticsEvent =
  | 'order_confirmed'
  | 'whatsapp_fallback_selected'
  | 'order_link_invalid'
  | 'order_link_generated'
  | 'order_link_copied'
  | 'order_created_direct'
  | 'order_items_edited'
  | 'order_deleted';

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: EventProps) => void;
    };
  }
}

/**
 * Forward a custom event to umami if available. Safe to call from any client
 * component in any environment — does nothing and never throws when umami is
 * absent.
 */
export function trackEvent(name: AnalyticsEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  try {
    window.umami?.track(name, props);
  } catch {
    /* analytics must never break the app */
  }
}
