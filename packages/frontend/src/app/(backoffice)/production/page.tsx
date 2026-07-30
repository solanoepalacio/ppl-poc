import { redirect } from 'next/navigation';

/**
 * The production view is split by production line. `/production` has no content
 * of its own; it redirects to the savory line so old links keep working.
 */
export default function ProductionPage() {
  redirect('/production/salados');
}
