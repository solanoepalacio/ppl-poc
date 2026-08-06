'use client';

import { useEffect } from 'react';

/** How long the view holds still at each end, and before it first moves. */
const DWELL_MS = 15_000;
/**
 * Scroll speed. A fixed pixels-per-second rate — rather than
 * `scrollTo({behavior:'smooth'})`, whose duration the browser picks — so the
 * movement looks the same whether the list is slightly or greatly taller than
 * the screen; only how long it takes changes.
 */
const SPEED_PX_PER_S = 45;

/**
 * Cycles an unattended view through a list too long to fit: hold, glide to the
 * bottom, hold, glide back to the top, hold, repeat. These views sit on a screen
 * in the production area that nobody touches, so a list that overflows would
 * otherwise have its tail permanently unread. Shared by the two production views
 * and Revisar Pedidos.
 *
 * Renders nothing — it only drives the scroll — and does nothing at all when the
 * content already fits, since movement with no purpose is a distraction on a
 * display people glance at.
 *
 * Scrolls `.bo-main`, the shell's scrolling column: the window does not scroll
 * here because `.bo-shell` is `position: fixed`.
 */
export function AutoScroll() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.bo-main');
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let timer = 0;
    let cancelled = false;

    const maxScroll = () => Math.max(0, el.scrollHeight - el.clientHeight);
    const overflows = () => maxScroll() > 4; // ignore sub-pixel rounding

    const wait = (ms: number, then: () => void) => {
      timer = window.setTimeout(() => {
        if (!cancelled) then();
      }, ms);
    };

    /**
     * Glides to `toBottom ? bottom : top`, re-reading the extent every frame so a
     * refresh that lands mid-cycle cannot leave it scrolling toward a stale
     * position. Pausing while hidden is done by simply not advancing: the clock
     * keeps ticking but the position does not move, so nothing is lost.
     *
     * The intended position is tracked in `pos` rather than read back from
     * `el.scrollTop` each frame. Some engines (notably TV browsers) store
     * scrollTop as an integer, so a sub-pixel step — at this speed a frame is
     * well under 1px — would be truncated away and the animation would never
     * advance from a standstill. Accumulating our own float and writing it out
     * means the rounding only affects what is painted, not the progress.
     */
    const glide = (toBottom: boolean, done: () => void) => {
      let last = performance.now();
      let pos = el.scrollTop;
      const step = (now: number) => {
        if (cancelled) return;
        const dt = (now - last) / 1000;
        last = now;

        if (document.visibilityState === 'hidden') {
          frame = requestAnimationFrame(step);
          return;
        }

        const limit = maxScroll();
        const target = toBottom ? limit : 0;
        const delta = SPEED_PX_PER_S * dt;
        pos = toBottom
          ? Math.min(target, pos + delta)
          : Math.max(target, pos - delta);
        el.scrollTop = pos;

        if (Math.abs(pos - target) < 1) {
          // Land exactly on the target, so a truncating engine cannot leave the
          // view a pixel short of the end.
          el.scrollTop = target;
          done();
          return;
        }
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const jump = (toBottom: boolean, done: () => void) => {
      el.scrollTop = toBottom ? maxScroll() : 0;
      done();
    };

    const move = (toBottom: boolean, done: () => void) =>
      reduced.matches ? jump(toBottom, done) : glide(toBottom, done);

    const cycle = () => {
      if (cancelled) return;
      // Re-checked each cycle: a refresh can grow or shrink the list.
      if (!overflows()) {
        wait(DWELL_MS, cycle);
        return;
      }
      move(true, () => wait(DWELL_MS, () => move(false, () => wait(DWELL_MS, cycle))));
    };

    wait(DWELL_MS, cycle);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
