## Context

`ProductionView.tsx` is a Server Component shared by both line views: it awaits
`getProductionTotals(undefined, category)` and renders one `.ptable` — a CSS
grid of `minmax(0, 1fr) 220px` with a head row, one row per product, and a
`.ptable-foot` carrying the summed total. `AutoRefresh` (a behaviour-only client
island) re-runs it every 30 seconds.

The view sits inside the back-office shell: a fixed-position `.bo-shell` with
the sidebar on the left and `.bo-main` as the scrolling column on the right, so
the view itself only controls what goes inside that column. `ViewHeader`, which
renders the title and its supporting line, is shared with the orders view.

## Goals / Non-Goals

**Goals:**
- Fit roughly twice as many products on screen before anything scrolls.
- Reduce each row to the one number the baker acts on, and show nothing that is
  not that.
- Make a row trackable across the full width of a wide screen at a glance.
- Preserve everything the views already guarantee: one line per view, always the
  open bloque, no bloque selector, read-only, self-refreshing.

**Non-Goals:**
- Changing what the API returns. Demand and existencia stay in the payload;
  they are the inputs to the number being shown.
- Making the hidden figures reachable some other way on this screen (a tooltip,
  an expandable row). If that turns out to be missed, it is a separate change.
- Any change to the orders view, which has its own markup and its own spec.

## Decisions

- **Two tables in a CSS grid, not one table with a column count.** Splitting the
  item list in the component and rendering two independent `.ptable` blocks
  side by side keeps each table's internal grid exactly as it is today; the only
  new CSS is the two-column wrapper. Trying to flow one table into two columns
  (CSS multi-column) would break the row grid and the header alignment.

- **Alternating (zig-zag) distribution: even indices left, odd indices right.**
  Chosen over splitting the list in half so the eye reads left-to-right row by
  row, the way a two-up list normally scans. With an odd number of products the
  left table simply gets the extra row.

- **The alternating colour is applied per table, by row position within that
  table.** Both tables therefore start on the same colour and stay in step
  across the screen, which is the point of the alternation — if it were driven
  by the global index the two tables would land out of phase and the stripes
  would read as noise.

- **Two colour families, slate and ink.** The brand slate (`--brand-slate`) and
  the standard ink (`--ink`) are the two treatments; each row takes one of them
  for its product name and its quantity chip, over a soft tint of the same
  family as its background.

- **No line total at all.** A pinned total was tried first and removed: on a
  per-product work list the summed figure is not actionable, and as a floating
  element it both competed with the per-product numbers and had to be worked
  around (reserved padding so it would not cover the last row). Dropping it
  removes the feature and the workaround together.

- **The row treatment extends to the quantity chip.** The chip's background is
  the row's own name colour rather than a fixed accent, so a row reads as one
  unit across its full width — which is the point of alternating at all on a
  screen this wide. The number inside therefore has to be light; white on both
  the slate and the ink clears AA comfortably.

- **Row backgrounds stay soft tints, not the full colours.** The saturated
  colours belong to the text and the chip; if the whole row took them, the
  numbers would have to fight the background for attention on a screen meant to
  be read at a glance.

- **The enlarged header line is scoped to the production views.** `ViewHeader`
  is shared with the orders view, so its `.subtitle` styling is not something to
  change globally; the production views pass a modifier class and the larger
  size hangs off that.

## Risks / Trade-offs

- **[Risk]** Two columns on a narrow viewport would squeeze product names to
  unreadable widths. → **Mitigation**: collapse to a single column below a
  breakpoint. These views are desktop/TV-first, but the back office is not
  blocked on small screens today and should not start being.
- **[Trade-off]** Hiding demand and existencia makes the displayed number
  unauditable from this screen (see the proposal). Accepted deliberately: the
  production line acts on "how many to make", and the inputs remain visible on
  the orders view where they are entered.
- **[Trade-off]** Tying the quantity chip to the row colour drops the distinct
  muted styling that a zero ("covered by existencia, nothing to bake") used to
  get. A zero now looks like any other number, just smaller in value. Worth
  naming because it was a deliberate signal before; restoring it would mean
  breaking the one-colour-per-row rule this change asks for.
- **[Trade-off]** Alternating colour by row position means adding or deleting an
  order can flip a product's colour between refreshes. Harmless — the colour
  carries no meaning beyond helping the eye track a row — but worth naming so it
  is not mistaken for a status indicator.
