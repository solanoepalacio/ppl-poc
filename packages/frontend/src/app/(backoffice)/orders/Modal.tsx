'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Lightweight modal built on the native <dialog> element: ESC-to-close, focus
 * trapping, and top-layer rendering (centered over the viewport, never clipped
 * by the card it's declared in) come for free. Every dialog shares one fixed
 * near-full-screen frame so the UI never jumps between dialogs; only the body
 * scrolls, while the header, footer, and an optional `aboveBody` region stay
 * pinned.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  aboveBody,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** A pinned region between the header and the scrolling body (e.g. a picker). */
  aboveBody?: ReactNode;
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
            className="modal-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        {aboveBody && <div className="modal-above">{aboveBody}</div>}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </dialog>
  );
}
