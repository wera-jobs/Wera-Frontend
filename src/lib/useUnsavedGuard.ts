import { useEffect } from 'react';

const QUESTION = 'You have changes that are not saved. Leave without saving them?';

/**
 * While there are unsaved edits, leaving asks first: closing or reloading
 * the tab (the browser's own question), and following a link inside the
 * app (ours). Links that open elsewhere (a new tab, a download) leave the
 * page where it is, so they pass.
 */
export function useUnsavedGuard(dirty: boolean, { unload = true }: { unload?: boolean } = {}) {
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== window.location.origin) return;
      // The same page (a tab's own section link): nothing is lost.
      if (a.pathname === window.location.pathname) return;
      if (!window.confirm(QUESTION)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // unload: false for a page that asks on closing itself, from state that
    // is current at that moment (this effect's copy is a render behind).
    if (unload) window.addEventListener('beforeunload', onUnload);
    // Before the router sees the click.
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, unload]);
}
