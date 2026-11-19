import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Puzzle, X } from 'lucide-react';
import { useConnections } from '../api/extension';
import { useExtension } from '../lib/extension';

/** Where to get the extension until it is on the Chrome Web Store: the help page says how. */
export const EXTENSION_HELP = '/help';

const DISMISSED = 'wera.extensionPromo';

/**
 * Offers the Chrome extension once, on Today, to someone who has neither
 * it in this browser nor a connection from another one. Dismissed for good.
 */
export function ExtensionPromo() {
  const version = useExtension();
  const connections = useConnections();
  const [gone, setGone] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) === '1';
    } catch {
      return false;
    }
  });
  if (gone || version || !connections.data || connections.data.connections.length > 0) return null;
  const dismiss = () => {
    setGone(true);
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // Private windows may refuse storage: it stays hidden for this visit.
    }
  };
  return (
    <section aria-labelledby="ext-promo" className="anim-rise flex items-start gap-3 rounded-card border border-border bg-surface p-4">
      <Puzzle className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <h2 id="ext-promo" className="text-sm font-semibold text-text">Fill applications in one click</h2>
        <p className="mt-0.5 max-w-2xl text-xs text-muted">
          The Wera extension for Chrome fills job applications from your details, drafts the open questions, and moves a job to Applied when you
          submit. You check every answer and press submit yourself.
        </p>
        <Link to={EXTENSION_HELP} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent/85">
          Get the extension
        </Link>
      </div>
      <button type="button" onClick={dismiss} aria-label="Don't show this again" className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-text">
        <X className="size-4" />
      </button>
    </section>
  );
}
