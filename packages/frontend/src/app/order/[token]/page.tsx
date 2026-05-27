import { validateToken } from '@/lib/api';
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
    return (
      <section className="card">
        <h1>This link is no longer valid</h1>
        <p className="muted">
          The order link has expired or has already been used. Please ask the
          bakery to send you a fresh link.
        </p>
      </section>
    );
  }

  return <OrderForm token={params.token} catalog={catalog} />;
}
