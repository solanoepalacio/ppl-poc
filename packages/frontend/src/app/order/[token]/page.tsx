import { validateToken } from '@/lib/api';
import { BrandHeader } from './BrandHeader';
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
      <>
        <BrandHeader />
        <section className="card outcome">
          <span className="emoji" aria-hidden="true">
            ⚠️
          </span>
          <h1>Este enlace ya no es válido</h1>
          <p>
            El enlace expiró o ya fue usado. Pedile a la panadería un nuevo
            enlace.
          </p>
        </section>
      </>
    );
  }

  return <OrderForm token={params.token} catalog={catalog} />;
}
