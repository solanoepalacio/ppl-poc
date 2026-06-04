'use client';

import { useRef } from 'react';
import type { FocusEvent, MouseEvent } from 'react';

/**
 * Handlers that make a text/number input select its whole value when focused,
 * so the next keystroke replaces the value instead of inserting into it.
 *
 * The focusing mouse click is the tricky case: the browser fires
 * mousedown → focus → mouseup, and that mouseup collapses the selection to the
 * caret. We tell the focusing click apart from a later, deliberate click by
 * recording (on mousedown) whether the field was already focused. Only the
 * focusing click's mouseup is prevented — so clicking again while focused still
 * places a caret for single-digit editing. Keyboard/programmatic focus has no
 * mouseup, so `select()` from onFocus simply sticks.
 *
 * Selection is bound to focus/mouse events, never to value, so normal typing
 * (which re-renders the controlled input) does not re-select.
 */
export function useSelectAllOnFocus() {
  const wasFocused = useRef(false);

  return {
    onMouseDown: (e: MouseEvent<HTMLInputElement>) => {
      wasFocused.current =
        typeof document !== 'undefined' &&
        document.activeElement === e.currentTarget;
    },
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      // No-op where select() is unsupported; today's behavior stays intact.
      e.currentTarget.select?.();
    },
    onMouseUp: (e: MouseEvent<HTMLInputElement>) => {
      if (!wasFocused.current) {
        // This mouseup belongs to the click that just focused the field;
        // keep the select() from collapsing to a caret.
        e.preventDefault();
      }
    },
  };
}
