## 1. The notice

- [x] 1.1 `OrderForm.tsx`: add the copy to `COPY` and render it under the title,
  above the filter. In `OrderForm` rather than `BrandHeader`, which the success
  and invalid-link screens also render.
- [x] 1.2 `globals.css`: style it as a statement of fact, not an error — the
  amber accent already used for the review notice would read as a warning, so
  this one is quieter. WCAG AA against its background.

## 2. Verify

- [x] 2.1 Frontend `lint`.
- [x] 2.2 Drive the entry screen: the notice is present and readable at 360×640
  and 320×568, and the catalog still gets most of the viewport. Measured: it
  costs 28px, leaving catalog + action bar 63% and 58% of the viewport.
- [x] 2.4 Below 360px it wrapped to three lines (8% of the viewport instead of
  5%). Tightened the type in a media query so it holds at two lines everywhere.
- [x] 2.3 Confirm it is absent from the order-received and invalid-link states.
