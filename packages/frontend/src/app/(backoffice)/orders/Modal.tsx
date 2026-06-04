'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Lightweight modal built on the native <dialog> element: ESC-to-close, focus
 * trapping, and top-layer rendering (centered over the viewport, never clipped
 * by the card it's declared in) come for free. The body scrolls while the
 * header and footer stay pinned, so long catalogs stay easy to navigate.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra class on the scrolling body, e.g. to opt into a custom region layout. */
  bodyClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => {
        // A click landing on the dialog element itself is a backdrop click.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <strong>{title}</strong>
          <button
            type="button"
            className="btn-secondary"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className={`modal-body${bodyClassName ? ` ${bodyClassName}` : ''}`}>
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </dialog>
  );
}
