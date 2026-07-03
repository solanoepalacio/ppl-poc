import { BrandHeader } from './BrandHeader';
import { TrackInvalidLink } from './TrackInvalidLink';

/**
 * The "this link is no longer valid" view. Shown both when the token is already
 * invalid on page load (server-rendered) and when a bloque is closed while the
 * customer is mid-form and their confirmation is rejected (client-rendered).
 * Bundles the analytics tracker so `order_link_invalid` fires in either case.
 */
export function InvalidLinkNotice() {
  return (
    <>
      <BrandHeader />
      <TrackInvalidLink />
      <section className="card outcome">
        <span className="emoji" aria-hidden="true">
          ⚠️
        </span>
        <h1>Este enlace ya no es válido</h1>
        <p>
          El enlace expiró o ya fue usado. Pedile a la panadería un nuevo enlace.
        </p>
      </section>
    </>
  );
}
