import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';
import { wrappedX } from './wrappedX';

const WORDS = [
  'International Student', 'H-1B Sponsorship', 'AI Engineer', 'New Grad 2027', 'STEM OPT', 'Site Reliability',
  'Offer', 'Fit 94', 'Remote', 'Registered Nurse', 'Data Scientist', 'Teacher', 'Night Shift', 'Return Offer', 'Referral', 'Cover Letter',
  'Green Card', 'Quant Researcher', 'Internship', 'Kubernetes', 'Product Manager', 'Hybrid', 'Series B', 'OPT',
  'Machine Learning', 'Backend', 'Interview Loop', 'Sponsors visas', 'Entry Level', 'Tailored Resume', 'Robotics',
  'Aerospace', 'Fintech', 'Day One CPT', 'Signing Bonus', 'Full-time', 'Applied', 'Strong Match', 'One Page',
];
// Some words glow in the accent color.
const ACCENT = new Set(['H-1B Sponsorship', 'Offer', 'Fit 94', 'International Student', 'Sponsors visas', 'Strong Match']);

const ROWS = 11;
const ROW_GAP = 28;
const WORD_GAP = 40;
const OPACITY = 0.32;
const RADIUS = 240;
/** How fast the light trails the pointer and opens or closes, in ms. */
const TRAIL = 96;
const OPEN = 110;

interface Word { text: string; x: number; width: number; font: string; spacing: string; accent: boolean }
interface Row { top: number; height: number; line: number; seconds: number; reverse: boolean; words: Word[] }

function layoutRows(ctx: CanvasRenderingContext2D): Row[] {
  let top = 0;
  return Array.from({ length: ROWS }, (_, i) => {
    const offset = (i * 7) % WORDS.length;
    const size = [30, 20, 24][i % 3], height = [36, 28, 32][i % 3];
    const spacing = `${-0.025 * size}px`;
    let x = 0;
    const words = [...WORDS.slice(offset), ...WORDS.slice(0, offset)].map((text, j): Word => {
      const font = j % 3 === 1 ? `400 ${size}px "Geist Mono Variable", monospace` : `600 ${size}px "Geist Variable", sans-serif`;
      ctx.font = font;
      ctx.letterSpacing = spacing;
      const width = ctx.measureText(text).width;
      const word = { text, x, width, font, spacing, accent: ACCENT.has(text) };
      x += width + WORD_GAP;
      return word;
    });
    const row = { top, height, line: x, seconds: 110 + (i % 4) * 25, reverse: i % 2 === 1, words };
    top += height + ROW_GAP;
    return row;
  });
}

/**
 * Black everywhere except a soft halo around each line of real text in the
 * field, sized to that text's font. Composited over the words, it fades them
 * behind anything being read while leaving them visible in the gaps.
 */
function keepClearMask(field: HTMLElement): HTMLCanvasElement | null {
  const box = field.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  // The mask is blurry by design, so a quarter-resolution canvas is plenty.
  const scale = 0.25;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(box.width * scale);
  canvas.height = Math.ceil(box.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';

  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  // Shadows instead of ctx.filter: the shape is drawn off-canvas and only
  // its blurred shadow lands, which every browser supports.
  const away = canvas.width + 1000;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const font = parseFloat(getComputedStyle(n.parentElement!).fontSize) || 16;
    const padX = font * 0.6, padY = font * 0.35;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = font * 1.1 * scale;
    ctx.shadowOffsetX = away;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width === 0) continue;
      const x = (r.left - box.left - padX) * scale, y = (r.top - box.top - padY) * scale;
      const w = (r.width + 2 * padX) * scale, h = (r.height + 2 * padY) * scale;
      ctx.beginPath();
      ctx.roundRect(x - away, y, w, h, h / 2);
      ctx.fill();
    }
  }
  return canvas;
}

/**
 * A plain field (near white in light mode, black in dark) hiding rows of
 * job-search words; a soft spotlight follows the pointer and reveals them
 * only there, and they fade out around the text in front so it stays
 * readable. Decorative: hidden from assistive tech.
 *
 * The words are drawn on one spotlight-sized canvas that the compositor
 * moves, and only while the pointer is here. A field of live text under a
 * CSS mask repaints every frame and Chrome could not keep up with it.
 */
export function RevealField({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current, spot = spotRef.current;
    if (!el || !spot) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const size = RADIUS * 2;
    let ctx: CanvasRenderingContext2D | null = null;
    let rows: Row[] | null = null;
    let mask: HTMLCanvasElement | null = null;
    let maskStale = true;
    let color = '', accent = '', rowsTop = 0;
    let x = 0, y = 0, tx = 0, ty = 0, radius = 0, inside = false, frame = 0, last = 0;

    const prepare = () => {
      if (!ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        spot.width = spot.height = size * dpr;
        ctx = spot.getContext('2d');
        ctx?.scale(dpr, dpr);
        if (ctx) ctx.textBaseline = 'middle';
      }
      if (!ctx) return false;
      rows ??= layoutRows(ctx);
      const end = rows[rows.length - 1];
      rowsTop = (el.clientHeight - (end.top + end.height)) / 2;
      const css = getComputedStyle(el);
      color = css.getPropertyValue('--color-text').trim();
      accent = `color-mix(in srgb, ${css.getPropertyValue('--color-accent').trim()} 80%, white)`;
      return true;
    };

    const paint = (now: number) => {
      if (!ctx || !rows) return;
      const left = x - RADIUS, top = y - RADIUS;
      spot.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = OPACITY;
      for (const row of rows) {
        const rowY = rowsTop + row.top - top;
        if (rowY + row.height < 0 || rowY > size) continue;
        const moved = still ? 0 : (now / 1000 / row.seconds) * row.line;
        const shift = row.reverse ? left - moved : left + moved;
        for (const w of row.words) {
          const wx = wrappedX(w.x, w.width, shift, row.line);
          if (wx >= size) continue;
          ctx.font = w.font;
          ctx.letterSpacing = w.spacing;
          ctx.fillStyle = w.accent ? accent : color;
          ctx.fillText(w.text, wx, rowY + row.height / 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'destination-in';
      const light = ctx.createRadialGradient(RADIUS, RADIUS, 0, RADIUS, RADIUS, Math.max(radius, 1));
      light.addColorStop(0, '#000');
      light.addColorStop(0.45, 'rgb(0 0 0 / 0.55)');
      light.addColorStop(1, 'transparent');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, size, size);
      if (maskStale) {
        mask = keepClearMask(el);
        maskStale = false;
      }
      if (mask) ctx.drawImage(mask, -left, -top, el.clientWidth, el.clientHeight);
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      // Ease toward the pointer for a calm, trailing light.
      const trail = still ? 1 : 1 - Math.exp(-dt / TRAIL);
      x += (tx - x) * trail;
      y += (ty - y) * trail;
      radius += ((inside ? RADIUS : 0) - radius) * (still ? 1 : 1 - Math.exp(-dt / OPEN));
      if (!inside && radius < 2) {
        frame = 0;
        radius = 0;
        ctx?.clearRect(0, 0, size, size);
        return;
      }
      paint(now);
      frame = requestAnimationFrame(tick);
    };

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (!inside) {
        if (!prepare()) return;
        inside = true;
        // Start at the pointer, unless the light is still closing elsewhere.
        if (!frame) {
          x = tx;
          y = ty;
        }
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    const leave = () => {
      inside = false;
    };
    // The fonts arrive after first paint; measure again with the real ones.
    const remeasure = () => {
      rows = null;
      maskStale = true;
      if (inside) prepare();
    };
    const stale = () => {
      maskStale = true;
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointercancel', leave);
    el.addEventListener('animationend', stale);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(stale);
    resize?.observe(el);
    const mutate = new MutationObserver(stale);
    mutate.observe(el, { childList: true, characterData: true, subtree: true });
    void document.fonts?.ready.then(remeasure);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointercancel', leave);
      el.removeEventListener('animationend', stale);
      resize?.disconnect();
      mutate.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={clsx('relative isolate overflow-hidden bg-bg', className)}>
      <canvas
        ref={spotRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 -z-10 will-change-transform"
        style={{ width: RADIUS * 2, height: RADIUS * 2 }}
      />
      {children}
    </div>
  );
}
