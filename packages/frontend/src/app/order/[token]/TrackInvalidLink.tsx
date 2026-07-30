'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Fires the `order_link_invalid` analytics event once when the invalid-link page
 * renders. Exists as a client component because the order page is a Server
 * Component and cannot call the client-side tracker directly.
 */
export function TrackInvalidLink() {
  useEffect(() => {
    trackEvent('order_link_invalid');
  }, []);
  return null;
}
