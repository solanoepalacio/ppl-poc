import { BrandHeader } from './BrandHeader';

/**
 * The "we have your order" view.
 *
 * Rendered from two places, which is the point of it being one component. The
 * form shows it the moment a confirmation goes through, from client state. The
 * page shows it on a *reload* of a link whose order was confirmed — and that
 * reload is not hypothetical: a phone browser restoring a discarded tab, a
 * pull-to-refresh, a step back, or the customer opening the same chat link
 * again all re-run the page, and the client state that was carrying this screen
 * is gone by then.
 *
 * Before this existed, all of those landed on "este enlace ya no es válido",
 * which is true of the link and false of the order — and reads, to somebody who
 * just tapped confirm, as the order having failed.
 */
export function OrderConfirmedNotice() {
  return (
    <>
      <BrandHeader />
      <section className="card outcome">
        <span className="emoji" aria-hidden="true">
          ✅
        </span>
        <h1>¡Pedido recibido!</h1>
        <p>Gracias. Tu pedido fue enviado a la panadería.</p>
      </section>
    </>
  );
}
