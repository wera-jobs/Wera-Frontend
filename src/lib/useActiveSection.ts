import { useEffect, useState } from 'react';

/**
 * Which of the page's sections the reader is in: the first one (in page
 * order) crossing a band just below the sticky headers. Null until one is
 * seen, and always without IntersectionObserver (older browsers, tests).
 * Pass ready = false while the page shows a loading state instead of its
 * sections: they are looked up once it turns true.
 */
export function useActiveSection(ids: readonly string[], ready = true): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(' ');
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return;
    const order = key.split(' ');
    const inBand = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        const first = order.find((id) => inBand.has(id));
        if (first) setActive(first);
      },
      // The band: from under the app header and the section nav, to 60% down the window.
      { rootMargin: '-112px 0px -40% 0px' },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [key, ready]);
  return active;
}
