## Why

Moving link generation into its own trigger (change `generar-link-standalone`) left
one requirement in `order-create-presentation` stale: "Creation modal omits per-path
explanatory copy" still frames the modal as a two-path choice and asserts the
generated link appears in the creation modal. Both are now false — the modal is
single-path, and the link lives in the separate Generar link modal. This reconciles
that requirement so the spec no longer contradicts itself.

## What Changes

- Rewrite the requirement as single-path: the order-creation modal SHALL NOT show
  explanatory framing paragraphs; drop the two-path wording and the obsolete
  "generated link is still shown here" scenario (that behavior lives in the Generar
  link modal now). No product or code change — this is spec hygiene only.

## Capabilities

### Modified Capabilities

- `order-create-presentation`: the "omits explanatory copy" requirement is stated
  for the single-path modal and no longer references link generation.

## Impact

- **Docs only.** No frontend, backend, or contract change.
