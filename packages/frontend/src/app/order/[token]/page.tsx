import { validateToken } from '@/lib/api';
import { InvalidLinkNotice } from './InvalidLinkNotice';
import { OrderForm } from './OrderForm';

/**
 * Customer order form route. Server-fetches token validity + catalog. Renders
 * the frictionless form only for a valid, unexpired token; otherwise shows an
 * "invalid link" page (the form is never rendered for an invalid token).
 */
export default async function OrderPage({
  params,
}: {
  params: { token: string };
}) {
  let valid = false;
  let catalog: Awaited<ReturnType<typeof validateToken>>['catalog'] = [];
  try {
    const res = await validateToken(params.token);
    valid = res.valid;
    catalog = res.catalog ?? [];
  } catch {
    valid = false;
  }

  if (!valid) {
    return <InvalidLinkNotice />;
  }

  return <OrderForm token={params.token} catalog={catalog} />;
}
