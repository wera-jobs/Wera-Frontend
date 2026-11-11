// Site analytics without cookies (see the server's docs/analytics.md): a
// small beacon when a page is seen and when it is left, with how long it
// was in view. Nothing is stored in the browser, and nothing is sent when
// the browser asks not to be tracked. It never waits on the network and
// never throws: the app works the same whether it is sent or not.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hadSession } from '../api/auth';

const ENDPOINT = '/api/page-seen';
/** A page must stay this long to count as seen: redirects pass through quicker. */
const SETTLE_MS = 500;
/** Whether this tab already counted its first page (the arrival is sent once). */
let started = false;

interface Beacon {
  k: 'view' | 'leave';
  p: string;
  r?: string;
  us?: string;
  um?: string;
  uc?: string;
  e?: number;
}

/** Whether to send nothing: the browser asks not to be tracked, a test, or a developer's own machine. */
export function trackingOff(nav: Navigator = navigator, host = location.hostname, mode: string = import.meta.env.MODE): boolean {
  const gpc = (nav as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  return nav.doNotTrack === '1' || gpc === true || nav.webdriver === true || mode === 'test'
    || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

function send(b: Beacon) {
  try {
    const body = JSON.stringify(b);
    // text/plain needs no preflight; sendBeacon survives the page closing.
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  } catch {
    // Analytics never gets in the way.
  }
}

/** The page as analytics names it: "/" is the landing page for visitors and Today for someone signed in. */
export function pageName(path: string, signedIn: boolean): string {
  return path === '/' && signedIn ? '/today' : path;
}

/** Where a visitor came from, the first time this tab loads the site: another site's address and its UTM tags. */
export function arrival(ref: string, search: string, host: string): Pick<Beacon, 'r' | 'us' | 'um' | 'uc'> {
  const q = new URLSearchParams(search);
  let r = '';
  try {
    if (ref && new URL(ref).hostname !== host) r = ref;
  } catch {
    r = '';
  }
  return { r, us: q.get('utm_source') ?? q.get('ref') ?? '', um: q.get('utm_medium') ?? '', uc: q.get('utm_campaign') ?? '' };
}

/**
 * Counts page views and time in view as the user moves through the app.
 * Put once inside the router (`always` is for tests, which are otherwise left out).
 */
export function PageTracker({ always = false }: { always?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!always && trackingOff()) return;
    const first = !started;
    started = true;
    const path = pageName(pathname, hadSession());
    let shownAt = document.visibilityState === 'visible' ? performance.now() : 0;
    let engaged = 0;
    let seen = false;
    const view = () => {
      if (seen) return;
      seen = true;
      send({ k: 'view', p: path, ...(first ? arrival(document.referrer, location.search, location.hostname) : {}) });
    };
    const timer = window.setTimeout(view, SETTLE_MS);
    const pause = () => {
      if (shownAt) engaged += performance.now() - shownAt;
      shownAt = 0;
    };
    // Hidden (another tab, the phone locked, closing): report the time so far, as the page may never come back.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        shownAt = performance.now();
        return;
      }
      pause();
      if (engaged > 0) {
        view();
        send({ k: 'leave', p: path, e: Math.round(engaged) });
        engaged = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      pause();
      // Another page of the app: this one was seen if it stayed long enough.
      if (seen && engaged > 0) send({ k: 'leave', p: path, e: Math.round(engaged) });
    };
  }, [pathname, always]);
  return null;
}

/** Forgets the first page (tests). */
export function resetTracking() {
  started = false;
}
