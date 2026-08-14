import type { Product, TokenState } from '@pannico/shared';
import { validateToken } from '@/lib/api';
import { InvalidLinkNotice } from './InvalidLinkNotice';
import { OrderConfirmedNotice } from './OrderConfirmedNotice';
import { OrderForm } from './OrderForm';

/**
 * Customer order form route. Server-fetches the token's state + catalog, and
 * renders the frictionless form only for a token that can still be ordered
 * against — the form is never rendered for one that cannot.
 *
 * The other two states are both "no form", and they are not the same message. A
 * token spent by this customer's own confirmation gets the success screen, so a
 * reload after ordering says the order arrived rather than that the link is
 * dead; anything else gets the invalid-link page. A failure to reach the backend
 * is read as invalid: without an answer we cannot tell a customer their order
 * went through.
 */
export default async function OrderPage({
  params,
}: {
  params: { token: string };
}) {
  let state: TokenState = 'invalid';
  let catalog: Product[] = [];
  try {
    const res = await validateToken(params.token);
    state = res.state;
    catalog = res.catalog ?? [];
  } catch {
    state = 'invalid';
  }

  if (state === 'confirmed') {
    return <OrderConfirmedNotice />;
  }
  if (state !== 'valid') {
    return <InvalidLinkNotice />;
  }

  return <OrderForm token={params.token} catalog={catalog} />;
}
