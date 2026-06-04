import { getProducts } from '@/lib/api';
import { LinkGenerator } from './LinkGenerator';
import { DirectOrderForm } from './DirectOrderForm';

/**
 * Back-office "Crear orden" view: the single destination for creating an order,
 * either by generating a shareable customer link or by recording the order
 * directly from its items.
 */
export default async function CreateOrderPage() {
  const products = await getProducts();

  return (
    <section>
      <h1>Crear orden</h1>

      <h2>Por link</h2>
      <p className="muted">
        Generate a link to share with the customer so they place the order
        themselves.
      </p>
      <LinkGenerator />

      <h2>Cargar orden</h2>
      <p className="muted">
        Enter the order directly when you take it yourself.
      </p>
      <DirectOrderForm products={products} />
    </section>
  );
}
