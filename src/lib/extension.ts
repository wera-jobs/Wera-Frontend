// The dashboard's side of the Wera for Chrome bridge. The extension adds
// a small script to this site (only the server its user signed in to);
// it marks the page and passes messages both ways:
//   - opening a job's posting tells the extension which job that tab is
//     for, so its panel shows the job even when the career site's
//     address differs from the one Wera has;
//   - a change made here (status, details, letter) or there makes the
//     other side refetch.
// Without the extension these messages go nowhere.
import { useEffect, useState } from 'react';

const FROM_DASHBOARD = 'wera-dashboard';
export const FROM_EXTENSION = 'wera-extension';
const READY = 'wera-extension:ready';

/** The installed extension's version, or null. */
export function extensionVersion(): string | null {
  return document.documentElement.dataset.weraExtension ?? null;
}

export function useExtension(): string | null {
  const [version, setVersion] = useState(extensionVersion);
  useEffect(() => {
    const onReady = () => setVersion(extensionVersion());
    window.addEventListener(READY, onReady);
    // The extension may have marked the page between the first render and
    // this effect, and its ready event is then already gone: read it now.
    onReady();
    return () => window.removeEventListener(READY, onReady);
  }, []);
  return version;
}

function post(data: Record<string, unknown>) {
  if (!extensionVersion()) return;
  window.postMessage({ source: FROM_DASHBOARD, ...data }, location.origin);
}

/** The user is opening this job's posting. */
export function handOffJob(jobId: number, url: string) {
  post({ type: 'open-job', jobId, url });
}

/** Something the extension shows changed here. */
export function announceChange(what = '') {
  post({ type: 'changed', what });
}

/**
 * Hands the extension a key for this account (the connect page), and
 * resolves true once it says it's connected; false if it doesn't answer.
 */
export function connectExtension(token: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(ok);
    };
    const onMessage = (e: MessageEvent<{ source?: string; type?: string }>) => {
      if (e.source === window && e.origin === location.origin && e.data?.source === FROM_EXTENSION && e.data.type === 'connected') done(true);
    };
    const timer = window.setTimeout(() => done(false), timeoutMs);
    window.addEventListener('message', onMessage);
    post({ type: 'connect', token, server: location.origin });
  });
}
