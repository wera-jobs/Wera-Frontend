import { useEffect } from 'react';

let locks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/**
 * Stops the page behind an overlay from scrolling while it is open. The
 * scrollbar's width is kept as padding, so the page does not shift sideways
 * when its scrollbar goes. Overlays may nest: the page unlocks when the
 * last one closes.
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (locks++ === 0) {
      const bar = window.innerWidth - document.documentElement.clientWidth;
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      body.style.overflow = 'hidden';
      if (bar > 0) body.style.paddingRight = `${bar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
