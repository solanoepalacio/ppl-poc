'use client';

/**
 * Prints the review sheet.
 *
 * The browser's own dialog rather than anything of ours: the person printing
 * already has one they know, with the printer, the paper size and the page
 * range in it, and none of that is ours to reproduce. The whole feature is this
 * button plus the print stylesheet in `globals.css`, which is where the sheet
 * stops being a wall display and becomes a page.
 *
 * A client component only because `window.print()` needs a browser. It carries
 * no state.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      className="btn-toolbar-ghost"
      onClick={() => window.print()}
    >
      Imprimir
    </button>
  );
}
